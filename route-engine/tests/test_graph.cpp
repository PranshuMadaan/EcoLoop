#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/common.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>

#include <cstdint>
#include <stdexcept>

using Catch::Matchers::WithinRel;

TEST_CASE("WastePayload arithmetic and total mass calculations", "[domain][payload]") {
    routing::WastePayload empty_payload{};
    REQUIRE(empty_payload.total_kg() == 0.0);

    routing::WastePayload p1{
        .organic_kg = 150.5,
        .dry_recyclable_kg = 75.25,
        .dry_non_recyclable_kg = 40.0,
        .hazardous_ewaste_kg = 12.25
    };

    REQUIRE_THAT(p1.total_kg(), WithinRel(278.0, 1e-9));

    routing::WastePayload p2{
        .organic_kg = 50.0,
        .dry_recyclable_kg = 24.75,
        .dry_non_recyclable_kg = 10.0,
        .hazardous_ewaste_kg = 2.75
    };

    SECTION("Operator += aggregation") {
        routing::WastePayload accum = p1;
        accum += p2;

        REQUIRE_THAT(accum.organic_kg, WithinRel(200.5, 1e-9));
        REQUIRE_THAT(accum.dry_recyclable_kg, WithinRel(100.0, 1e-9));
        REQUIRE_THAT(accum.dry_non_recyclable_kg, WithinRel(50.0, 1e-9));
        REQUIRE_THAT(accum.hazardous_ewaste_kg, WithinRel(15.0, 1e-9));
        REQUIRE_THAT(accum.total_kg(), WithinRel(365.5, 1e-9));
    }

    SECTION("Binary operator + summation") {
        const auto sum = p1 + p2;

        REQUIRE_THAT(sum.organic_kg, WithinRel(200.5, 1e-9));
        REQUIRE_THAT(sum.dry_recyclable_kg, WithinRel(100.0, 1e-9));
        REQUIRE_THAT(sum.dry_non_recyclable_kg, WithinRel(50.0, 1e-9));
        REQUIRE_THAT(sum.hazardous_ewaste_kg, WithinRel(15.0, 1e-9));
        REQUIRE_THAT(sum.total_kg(), WithinRel(365.5, 1e-9));
    }
}

TEST_CASE("Facility stream acceptance logic (is_sink_for)", "[domain][node]") {
    using routing::NodeType;
    using routing::WasteStream;

    const routing::WasteNode depot{
        .id = 0,
        .type = NodeType::Depot
    };

    const routing::WasteNode collection_pt{
        .id = 1,
        .type = NodeType::CollectionPoint
    };

    const routing::WasteNode transfer_station{
        .id = 2,
        .type = NodeType::TransferStation
    };

    const routing::WasteNode composting{
        .id = 3,
        .type = NodeType::CompostingFacility
    };

    const routing::WasteNode mrf{
        .id = 4,
        .type = NodeType::MaterialRecoveryFacility
    };

    const routing::WasteNode landfill{
        .id = 5,
        .type = NodeType::Landfill
    };

    // Depots, collection points, and transfer stations do not act as final processing sinks
    CHECK_FALSE(depot.is_sink_for(WasteStream::Organic));
    CHECK_FALSE(depot.is_sink_for(WasteStream::DryRecyclable));
    CHECK_FALSE(depot.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(depot.is_sink_for(WasteStream::HazardousEwaste));

    CHECK_FALSE(collection_pt.is_sink_for(WasteStream::Organic));
    CHECK_FALSE(collection_pt.is_sink_for(WasteStream::DryRecyclable));
    CHECK_FALSE(collection_pt.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(collection_pt.is_sink_for(WasteStream::HazardousEwaste));

    CHECK_FALSE(transfer_station.is_sink_for(WasteStream::Organic));
    CHECK_FALSE(transfer_station.is_sink_for(WasteStream::DryRecyclable));
    CHECK_FALSE(transfer_station.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(transfer_station.is_sink_for(WasteStream::HazardousEwaste));

    // Composting facility strictly accepts organic waste
    CHECK(composting.is_sink_for(WasteStream::Organic));
    CHECK_FALSE(composting.is_sink_for(WasteStream::DryRecyclable));
    CHECK_FALSE(composting.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(composting.is_sink_for(WasteStream::HazardousEwaste));

    // Material Recovery Facility (MRF) strictly accepts dry recyclables
    CHECK_FALSE(mrf.is_sink_for(WasteStream::Organic));
    CHECK(mrf.is_sink_for(WasteStream::DryRecyclable));
    CHECK_FALSE(mrf.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(mrf.is_sink_for(WasteStream::HazardousEwaste));

    // Landfill strictly accepts dry non-recyclable residuals
    CHECK_FALSE(landfill.is_sink_for(WasteStream::Organic));
    CHECK_FALSE(landfill.is_sink_for(WasteStream::DryRecyclable));
    CHECK(landfill.is_sink_for(WasteStream::DryNonRecyclable));
    CHECK_FALSE(landfill.is_sink_for(WasteStream::HazardousEwaste));
}

TEST_CASE("DirectedGraph construction with asymmetric edges", "[graph][csr]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{
        .id = 0,
        .type = routing::NodeType::Depot,
        .latitude = 12.9716,
        .longitude = 77.5946
    });

    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 12.9780,
        .longitude = 77.5990,
        .service_time_seconds = 180.0
    });

    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::MaterialRecoveryFacility,
        .latitude = 12.9850,
        .longitude = 77.6050
    });

    // Asymmetrical edges: 0 -> 1 is 1200m @ 10 m/s, but 1 -> 0 is 1500m @ 8 m/s (one-way / different road)
    builder.add_edge(0, 1, 1200.0, 10.0, routing::turn_flags::kStraight);
    builder.add_edge(1, 0, 1500.0, 8.0, routing::turn_flags::kRight);
    // 1 -> 2 exists, but 2 -> 1 does NOT exist
    builder.add_edge(1, 2, 2800.0, 14.0, routing::turn_flags::kLeft);

    const auto graph = builder.build();

    REQUIRE(graph.node_count() == 3);
    REQUIRE(graph.edge_count() == 3);

    // Node 0 outgoing edges
    const auto edges_0 = graph.outgoing_edges(0);
    REQUIRE(edges_0.size() == 1);
    CHECK(edges_0[0].target == 1);
    CHECK_THAT(edges_0[0].distance_meters, WithinRel(1200.0, 1e-9));
    CHECK_THAT(edges_0[0].speed_mps, WithinRel(10.0, 1e-9));
    CHECK(edges_0[0].turn_penalty_flags == routing::turn_flags::kStraight);

    // Node 1 outgoing edges
    const auto edges_1 = graph.outgoing_edges(1);
    REQUIRE(edges_1.size() == 2);
    CHECK(edges_1[0].target == 0);
    CHECK_THAT(edges_1[0].distance_meters, WithinRel(1500.0, 1e-9));
    CHECK_THAT(edges_1[0].speed_mps, WithinRel(8.0, 1e-9));
    CHECK(edges_1[0].turn_penalty_flags == routing::turn_flags::kRight);

    CHECK(edges_1[1].target == 2);
    CHECK_THAT(edges_1[1].distance_meters, WithinRel(2800.0, 1e-9));
    CHECK_THAT(edges_1[1].speed_mps, WithinRel(14.0, 1e-9));
    CHECK(edges_1[1].turn_penalty_flags == routing::turn_flags::kLeft);

    // Node 2 has zero outgoing edges (asymmetry: 1 -> 2 exists, 2 -> 1 does not)
    const auto edges_2 = graph.outgoing_edges(2);
    CHECK(edges_2.empty());
    CHECK(edges_2.size() == 0);
}

TEST_CASE("Isolated nodes handling in DirectedGraph", "[graph][csr][isolated]") {
    routing::GraphBuilder builder;

    // Node 0: connected to 2
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Node 1: completely isolated (0 incoming, 0 outgoing)
    builder.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CollectionPoint});
    // Node 2: has edge to 0, and edge to 3
    builder.add_node(routing::WasteNode{.id = 2, .type = routing::NodeType::TransferStation});
    // Node 3: isolated sink (has incoming from 2, 0 outgoing)
    builder.add_node(routing::WasteNode{.id = 3, .type = routing::NodeType::Landfill});

    builder.add_edge(0, 2, 500.0, 12.0);
    builder.add_edge(2, 0, 500.0, 12.0);
    builder.add_edge(2, 3, 1000.0, 15.0);

    const auto graph = builder.build();

    REQUIRE(graph.node_count() == 4);
    REQUIRE(graph.edge_count() == 3);

    // Offsets verification: size should be 4 + 1 = 5
    const auto offsets = graph.head_offsets();
    REQUIRE(offsets.size() == 5);

    // Node 1 is isolated: head_offsets_[1] == head_offsets_[2]
    CHECK(offsets[1] == offsets[2]);
    const auto edges_1 = graph.outgoing_edges(1);
    CHECK(edges_1.empty());
    CHECK(edges_1.data() == nullptr);

    // Node 3 is a sink with 0 outgoing: head_offsets_[3] == head_offsets_[4]
    CHECK(offsets[3] == offsets[4]);
    const auto edges_3 = graph.outgoing_edges(3);
    CHECK(edges_3.empty());

    // Active nodes verify correctly
    CHECK(graph.outgoing_edges(0).size() == 1);
    CHECK(graph.outgoing_edges(2).size() == 2);
}

TEST_CASE("Boundary checks and out-of-range exception handling", "[graph][csr][exceptions]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    builder.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CollectionPoint});
    builder.add_edge(0, 1, 100.0, 10.0);

    const auto graph = builder.build();

    // Valid accesses
    REQUIRE_NOTHROW(graph.node(0));
    REQUIRE_NOTHROW(graph.node(1));
    REQUIRE_NOTHROW(graph.outgoing_edges(0));
    REQUIRE_NOTHROW(graph.outgoing_edges(1));

    // Invalid node lookups throw std::out_of_range
    REQUIRE_THROWS_AS(graph.node(2), std::out_of_range);
    REQUIRE_THROWS_AS(graph.node(999), std::out_of_range);
    REQUIRE_THROWS_AS(graph.node(routing::kInvalidNodeId), std::out_of_range);

    // Invalid outgoing_edges lookups throw std::out_of_range
    REQUIRE_THROWS_AS(graph.outgoing_edges(2), std::out_of_range);
    REQUIRE_THROWS_AS(graph.outgoing_edges(999), std::out_of_range);
    REQUIRE_THROWS_AS(graph.outgoing_edges(routing::kInvalidNodeId), std::out_of_range);

    SECTION("Builder detects out-of-range edge endpoints") {
        routing::GraphBuilder bad_edge_builder;
        bad_edge_builder.add_node(routing::WasteNode{.id = 0});
        bad_edge_builder.add_edge(0, 5, 200.0, 10.0); // Node 5 does not exist

        REQUIRE_THROWS_AS(bad_edge_builder.build(), std::out_of_range);
    }

    SECTION("Builder detects non-contiguous node IDs") {
        routing::GraphBuilder gap_builder;
        gap_builder.add_node(routing::WasteNode{.id = 0});
        gap_builder.add_node(routing::WasteNode{.id = 2}); // Missing node 1

        REQUIRE_THROWS_AS(gap_builder.build(), std::invalid_argument);
    }
}

TEST_CASE("Graph nodes ordering and turn penalty flags preservation", "[graph][csr][flags]") {
    routing::GraphBuilder builder;

    // Add nodes in unordered sequence
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::Landfill,
        .latitude = 13.0,
        .longitude = 78.0,
        .service_time_seconds = 300.0
    });
    builder.add_node(routing::WasteNode{
        .id = 0,
        .type = routing::NodeType::Depot,
        .latitude = 11.0,
        .longitude = 76.0
    });
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 12.0,
        .longitude = 77.0
    });

    builder.add_edge(0, 1, 100.0, 10.0, routing::turn_flags::kUTurn);
    builder.add_edge(0, 2, 200.0, 20.0, routing::turn_flags::kLeft | routing::turn_flags::kStraight);

    const auto graph = builder.build();

    // Verify nodes were sorted into [0, 1, 2]
    REQUIRE(graph.node(0).id == 0);
    REQUIRE(graph.node(0).type == routing::NodeType::Depot);
    REQUIRE(graph.node(1).id == 1);
    REQUIRE(graph.node(1).type == routing::NodeType::CollectionPoint);
    REQUIRE(graph.node(2).id == 2);
    REQUIRE(graph.node(2).type == routing::NodeType::Landfill);
    REQUIRE(graph.node(2).service_time_seconds == 300.0);

    const auto edges = graph.outgoing_edges(0);
    REQUIRE(edges.size() == 2);
    CHECK(edges[0].target == 1);
    CHECK(edges[0].turn_penalty_flags == routing::turn_flags::kUTurn);
    CHECK(edges[1].target == 2);
    CHECK(edges[1].turn_penalty_flags == (routing::turn_flags::kLeft | routing::turn_flags::kStraight));
}
