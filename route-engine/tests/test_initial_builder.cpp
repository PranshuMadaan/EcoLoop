#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/active_vehicle.hpp>
#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/facility_index.hpp>
#include <routing/graph.hpp>
#include <routing/initial_builder.hpp>
#include <routing/node.hpp>
#include <routing/vehicle.hpp>

#include <algorithm>
#include <vector>

using Catch::Matchers::WithinRel;

// Helper: checks that a NodeId appears in a route's stops
static bool route_contains(const routing::Route& route, routing::NodeId id) {
    return std::find(route.stops.begin(), route.stops.end(), id) != route.stops.end();
}

TEST_CASE("ActiveVehicle state tracking and reset_load", "[active_vehicle]") {
    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{500.0, 300.0, 200.0, 50.0},
        .max_shift_duration_seconds = 28800.0
    };

    routing::ActiveVehicle av(veh, 0);

    REQUIRE(av.vehicle == &veh);
    REQUIRE(av.current_location == 0);
    REQUIRE(av.current_time_seconds == 0.0);
    REQUIRE(av.current_load.total_kg() == 0.0);
    REQUIRE(av.current_route.size() == 1); // depot is first stop

    // Load up some payload
    av.current_load.organic_kg = 490.0;
    av.current_load.dry_recyclable_kg = 150.0;

    // Adding 20 kg organic would overflow (490 + 20 = 510 > 500)
    const routing::WastePayload overflow_demand{.organic_kg = 20.0};
    CHECK(av.would_overflow(overflow_demand));

    // Adding 10 kg organic is fine (490 + 10 = 500 == limit, not strictly greater)
    const routing::WastePayload exact_demand{.organic_kg = 10.0};
    CHECK_FALSE(av.would_overflow(exact_demand));

    // Reset organic compartment
    av.reset_load(routing::WasteStream::Organic);
    REQUIRE(av.current_load.organic_kg == 0.0);
    REQUIRE_THAT(av.current_load.dry_recyclable_kg, WithinRel(150.0, 1e-9)); // unchanged

    // Dry recyclable overflow check
    av.current_load.dry_recyclable_kg = 290.0;
    const routing::WastePayload dry_overflow{.dry_recyclable_kg = 20.0}; // 290 + 20 = 310 > 300
    CHECK(av.would_overflow(dry_overflow));

    av.reset_load(routing::WasteStream::DryRecyclable);
    REQUIRE(av.current_load.dry_recyclable_kg == 0.0);

    // has_time_remaining
    CHECK(av.has_time_remaining(28800.0));
    av.current_time_seconds = 28800.0;
    CHECK_FALSE(av.has_time_remaining(28800.0));
}

TEST_CASE("FacilityIndex: sink indexing and nearest-sink query", "[facility_index]") {
    routing::GraphBuilder builder;

    // 0: Depot
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // 1: Collection point
    builder.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CollectionPoint});
    // 2: Composting facility (accepts Organic)
    builder.add_node(routing::WasteNode{.id = 2, .type = routing::NodeType::CompostingFacility});
    // 3: MRF (accepts DryRecyclable)
    builder.add_node(routing::WasteNode{.id = 3, .type = routing::NodeType::MaterialRecoveryFacility});
    // 4: Landfill (accepts DryNonRecyclable)
    builder.add_node(routing::WasteNode{.id = 4, .type = routing::NodeType::Landfill});

    // 2 is far from 0 (2000m), 3 is close to 0 (100m), 4 is medium (500m)
    builder.add_edge(0, 2, 2000.0, 10.0); // 200s
    builder.add_edge(0, 3, 100.0, 10.0);  // 10s
    builder.add_edge(0, 4, 500.0, 10.0);  // 50s
    builder.add_edge(1, 2, 300.0, 10.0);  // 30s
    builder.add_edge(1, 3, 800.0, 10.0);  // 80s

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);

    // Check indexing
    CHECK(facility_index.has_sink_for(routing::WasteStream::Organic));
    CHECK(facility_index.has_sink_for(routing::WasteStream::DryRecyclable));
    CHECK(facility_index.has_sink_for(routing::WasteStream::DryNonRecyclable));
    CHECK_FALSE(facility_index.has_sink_for(routing::WasteStream::HazardousEwaste));

    CHECK(facility_index.sinks_for(routing::WasteStream::Organic).size() == 1);
    CHECK(facility_index.sinks_for(routing::WasteStream::Organic)[0] == 2);
    CHECK(facility_index.sinks_for(routing::WasteStream::DryRecyclable)[0] == 3);

    // Nearest Organic sink from node 0: only node 2 (200s) -> NodeId 2
    const auto nearest_organic = facility_index.find_nearest_sink(
        graph, evaluator, 0, routing::WasteStream::Organic);
    REQUIRE(nearest_organic == 2);

    // Nearest Organic sink from node 1: node 2 (30s) -> NodeId 2
    const auto nearest_organic_from_1 = facility_index.find_nearest_sink(
        graph, evaluator, 1, routing::WasteStream::Organic);
    REQUIRE(nearest_organic_from_1 == 2);

    // No HazardousEwaste sink
    const auto nearest_ewaste = facility_index.find_nearest_sink(
        graph, evaluator, 0, routing::WasteStream::HazardousEwaste);
    REQUIRE(nearest_ewaste == routing::kInvalidNodeId);
}

TEST_CASE("InitialSolutionBuilder: Greedy nearest-neighbor routing order", "[initial_builder]") {
    routing::GraphBuilder builder;

    // Node 0: Depot
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Node 1: Close collection stop (100m from depot)
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 50.0},
        .service_time_seconds = 60.0
    });
    // Node 2: Far collection stop (2000m from depot)
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 50.0},
        .service_time_seconds = 60.0
    });
    // Node 3: Composting Facility (final dump)
    builder.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::CompostingFacility,
        .service_time_seconds = 0.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };

    add_bi(0, 1, 100.0);   // 10s travel
    add_bi(0, 2, 2000.0);  // 200s travel
    add_bi(1, 2, 1900.0);  // going from near to far
    add_bi(1, 3, 200.0);
    add_bi(2, 3, 500.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{500.0, 500.0, 500.0, 500.0},
        .max_shift_duration_seconds = 28800.0
    };

    const auto solution = builder_svc.build(0, {1, 2}, {veh});

    REQUIRE(solution.routes.size() == 1);
    const auto& route = solution.routes[0];

    // Route must start and end at the depot, emptying at the disposal facility
    // (terminal sink 3) before returning
    REQUIRE(route.start_node() == 0);
    REQUIRE(route.end_node() == 0);
    REQUIRE(route_contains(route, 3));

    // Both stops collected
    CHECK(route_contains(route, 1));
    CHECK(route_contains(route, 2));

    // Nearest-neighbor: stop 1 (100m) should be visited BEFORE stop 2 (2000m)
    const auto& stops = route.stops;
    const auto idx_1 = std::find(stops.begin(), stops.end(), routing::NodeId{1}) - stops.begin();
    const auto idx_2 = std::find(stops.begin(), stops.end(), routing::NodeId{2}) - stops.begin();
    CHECK(idx_1 < idx_2);
}

TEST_CASE("InitialSolutionBuilder: Intermediate replenishment (dump trip on overflow)", "[initial_builder][overflow]") {
    routing::GraphBuilder builder;

    // Node 0: Depot
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Node 1: Collection Bin A (200 kg organic)
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 200.0},
        .service_time_seconds = 60.0
    });
    // Node 2: Collection Bin B (200 kg organic)
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 200.0},
        .service_time_seconds = 60.0
    });
    // Node 3: Collection Bin C (200 kg organic) -- would overflow vehicle after Bin B
    builder.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 200.0},
        .service_time_seconds = 60.0
    });
    // Node 4: Composting Facility (nearest / only Organic sink)
    builder.add_node(routing::WasteNode{
        .id = 4,
        .type = routing::NodeType::CompostingFacility,
        .service_time_seconds = 120.0
    });

    // Simple chain layout: 0 -> 1 -> 2 -> 3 (equidistant)
    // Composting facility 4 is reachable from all nodes
    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };

    add_bi(0, 1, 100.0);
    add_bi(1, 2, 100.0);
    add_bi(2, 3, 100.0);
    add_bi(3, 4, 100.0);

    // Connect everything to composting for disposal
    add_bi(0, 4, 500.0);
    add_bi(1, 4, 400.0);
    add_bi(2, 4, 300.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    // Vehicle capacity: 500 kg organic -- Bin A + Bin B = 400kg (ok), adding Bin C = 600kg (OVERFLOW)
    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 500.0,
                                                  .dry_recyclable_kg = 1000.0,
                                                  .dry_non_recyclable_kg = 1000.0,
                                                  .hazardous_ewaste_kg = 1000.0},
        .max_shift_duration_seconds = 28800.0
    };

    // Unassigned in order 1, 2, 3 (forcing the greedy to take them in sequence)
    const auto solution = builder_svc.build(0, {1, 2, 3}, {veh});

    REQUIRE(solution.routes.size() == 1);
    const auto& route = solution.routes[0];
    const auto& stops = route.stops;

    // Expected route: 0 -> 1 -> 2 -> 4(dump) -> 3 -> 4(final) -> 0(depot return)
    // Start/end depot and final composting confirmed
    REQUIRE(route.start_node() == 0);
    REQUIRE(route.end_node() == 0);

    // All bins must be collected
    CHECK(route_contains(route, 1));
    CHECK(route_contains(route, 2));
    CHECK(route_contains(route, 3));

    // The composting facility (4) must appear at least twice: once for the intermediate dump,
    // once as the final destination
    const std::ptrdiff_t count_4 = std::count(stops.begin(), stops.end(), routing::NodeId{4});
    CHECK(count_4 >= 2);

    // The intermediate dump trip: bin1 and bin2 must both appear BEFORE
    // the first occurrence of the composting facility
    const auto first_dump_it = std::find(stops.begin(), stops.end(), routing::NodeId{4});
    const auto idx_dump = first_dump_it - stops.begin();
    const auto idx_bin1 = std::find(stops.begin(), stops.end(), routing::NodeId{1}) - stops.begin();
    const auto idx_bin2 = std::find(stops.begin(), stops.end(), routing::NodeId{2}) - stops.begin();
    CHECK(idx_bin1 < idx_dump);
    CHECK(idx_bin2 < idx_dump);

    // Bin 3 must appear AFTER the first dump trip
    const auto idx_bin3 = std::find(stops.begin(), stops.end(), routing::NodeId{3}) - stops.begin();
    CHECK(idx_bin3 > idx_dump);
}

TEST_CASE("InitialSolutionBuilder: Shift limit causes handoff to second vehicle", "[initial_builder][shift_limit]") {
    routing::GraphBuilder builder;

    // Node 0: Depot
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Node 1: Near stop (service 100s)
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 10.0},
        .service_time_seconds = 100.0
    });
    // Node 2: Far stop (service 100s) -- projected time pushes vehicle over budget
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 10.0},
        .service_time_seconds = 100.0
    });
    // Node 3: Composting Facility (disposal terminal)
    builder.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::CompostingFacility,
        .service_time_seconds = 0.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d, double speed = 10.0) {
        builder.add_edge(u, v, d, speed);
        builder.add_edge(v, u, d, speed);
    };

    // Node 1 is 100m from depot (10s travel)
    add_bi(0, 1, 100.0);
    // Node 2 is 10000m from depot (1000s travel)
    add_bi(0, 2, 10000.0);
    // Node 3 (composter) nearby
    add_bi(0, 3, 50.0);
    add_bi(1, 3, 200.0);
    add_bi(2, 3, 300.0);
    add_bi(1, 2, 9900.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    // Vehicle 1: very tight shift budget (300s):
    //   Depot -> Stop1 = 10s travel + 100s service = 110s
    //   Then stop2 would be 1000s travel + 100s service + 300s return = 1410s projected -> OVER budget!
    const routing::WasteVehicle veh1{
        .id = 1,
        .capacity_limits = routing::WastePayload{500.0, 500.0, 500.0, 500.0},
        .max_shift_duration_seconds = 300.0
    };
    // Vehicle 2: generous shift budget to handle remaining stops
    const routing::WasteVehicle veh2{
        .id = 2,
        .capacity_limits = routing::WastePayload{500.0, 500.0, 500.0, 500.0},
        .max_shift_duration_seconds = 28800.0
    };

    const auto solution = builder_svc.build(0, {1, 2}, {veh1, veh2});

    // Must generate 2 routes since vehicle 1 ran out of shift time
    REQUIRE(solution.routes.size() == 2);

    const auto& route1 = solution.routes[0];
    const auto& route2 = solution.routes[1];

    // Vehicle 1 handles only stop 1 (within budget)
    CHECK(route_contains(route1, 1));
    CHECK_FALSE(route_contains(route1, 2));

    // Vehicle 2 handles stop 2 (overflow from vehicle 1)
    CHECK(route_contains(route2, 2));

    // Both routes must start and end at depot
    CHECK(route1.start_node() == 0);
    CHECK(route2.start_node() == 0);
    CHECK(route1.end_node() == 0);
    CHECK(route2.end_node() == 0);
}

TEST_CASE("InitialSolutionBuilder: Overflow with no facility terminates and reports unserved", "[initial_builder][overflow]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Stop 1: 25 kg organic
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 25.0},
        .service_time_seconds = 60.0
    });
    // Stop 2: 30 kg organic — 25 + 30 > 50 capacity, no composting facility exists
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 30.0},
        .service_time_seconds = 60.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };
    add_bi(0, 1, 100.0);
    add_bi(0, 2, 200.0);
    add_bi(1, 2, 100.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 50.0, .dry_recyclable_kg = 1000.0,
                                                 .dry_non_recyclable_kg = 1000.0, .hazardous_ewaste_kg = 1000.0},
        .max_shift_duration_seconds = 28800.0
    };

    // Regression: this used to infinite-loop when no disposal facility existed
    const auto solution = builder_svc.build(0, {1, 2}, {veh});

    REQUIRE(solution.routes.size() == 1);
    CHECK(solution.routes[0].start_node() == 0);
    CHECK(solution.routes[0].end_node() == 0);
    CHECK(route_contains(solution.routes[0], 1));

    REQUIRE(solution.unserved_stops.size() == 1);
    CHECK(solution.unserved_stops[0] == 2);
}

TEST_CASE("InitialSolutionBuilder: Overflow with no facility hands off to second vehicle", "[initial_builder][overflow]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 25.0},
        .service_time_seconds = 60.0
    });
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 30.0},
        .service_time_seconds = 60.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };
    add_bi(0, 1, 100.0);
    add_bi(0, 2, 200.0);
    add_bi(1, 2, 100.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    const routing::WasteVehicle veh1{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 50.0, .dry_recyclable_kg = 1000.0,
                                                 .dry_non_recyclable_kg = 1000.0, .hazardous_ewaste_kg = 1000.0},
        .max_shift_duration_seconds = 28800.0
    };
    const routing::WasteVehicle veh2{
        .id = 2,
        .capacity_limits = routing::WastePayload{.organic_kg = 50.0, .dry_recyclable_kg = 1000.0,
                                                 .dry_non_recyclable_kg = 1000.0, .hazardous_ewaste_kg = 1000.0},
        .max_shift_duration_seconds = 28800.0
    };

    const auto solution = builder_svc.build(0, {1, 2}, {veh1, veh2});

    // Vehicle 1 fills up on stop 1; stop 2 overflows and is handed to vehicle 2
    REQUIRE(solution.routes.size() == 2);
    CHECK(route_contains(solution.routes[0], 1));
    CHECK_FALSE(route_contains(solution.routes[0], 2));
    CHECK(route_contains(solution.routes[1], 2));
    CHECK(solution.routes[0].start_node() == 0);
    CHECK(solution.routes[0].end_node() == 0);
    CHECK(solution.routes[1].start_node() == 0);
    CHECK(solution.routes[1].end_node() == 0);
    CHECK(solution.unserved_stops.empty());
}

TEST_CASE("InitialSolutionBuilder: Stop demand exceeding every vehicle capacity is unserved", "[initial_builder][overflow]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Stop 1: 60 kg organic — larger than any truck's 50 kg compartment
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 60.0},
        .service_time_seconds = 60.0
    });
    // Stop 2: small stop that must still be served
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 10.0},
        .service_time_seconds = 60.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };
    add_bi(0, 1, 100.0);
    add_bi(0, 2, 300.0);
    add_bi(1, 2, 250.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);
    const routing::InitialSolutionBuilder builder_svc(graph, evaluator, facility_index);

    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 50.0, .dry_recyclable_kg = 1000.0,
                                                 .dry_non_recyclable_kg = 1000.0, .hazardous_ewaste_kg = 1000.0},
        .max_shift_duration_seconds = 28800.0
    };

    const auto solution = builder_svc.build(0, {1, 2}, {veh});

    // The oversized stop is reported unserved; the small one is still collected
    REQUIRE(solution.routes.size() == 1);
    CHECK_FALSE(route_contains(solution.routes[0], 1));
    CHECK(route_contains(solution.routes[0], 2));

    REQUIRE(solution.unserved_stops.size() == 1);
    CHECK(solution.unserved_stops[0] == 1);
}

TEST_CASE("FacilityIndex: TransferStation is a sink for hazardous e-waste", "[facility_index]") {
    routing::GraphBuilder builder;
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    builder.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CollectionPoint});
    builder.add_node(routing::WasteNode{.id = 2, .type = routing::NodeType::TransferStation});
    builder.add_edge(1, 2, 100.0, 10.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FacilityIndex facility_index(graph);

    CHECK(facility_index.has_sink_for(routing::WasteStream::HazardousEwaste));
    CHECK(facility_index.sinks_for(routing::WasteStream::HazardousEwaste)[0] == 2);
    CHECK(facility_index.find_nearest_sink(graph, evaluator, 1,
                                           routing::WasteStream::HazardousEwaste) == 2);

    // A transfer station is not a sink for the other streams
    CHECK_FALSE(facility_index.has_sink_for(routing::WasteStream::Organic));
    CHECK_FALSE(facility_index.has_sink_for(routing::WasteStream::DryRecyclable));
    CHECK_FALSE(facility_index.has_sink_for(routing::WasteStream::DryNonRecyclable));
}
