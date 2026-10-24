#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/engine.hpp>
#include <routing/node.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <algorithm>
#include <cstddef>
#include <stdexcept>
#include <vector>

using Catch::Matchers::WithinRel;

namespace {

// Helper: check if a stop is contained in a route
bool route_contains_stop(const routing::Route& route, routing::NodeId id) noexcept {
    return std::find(route.stops.begin(), route.stops.end(), id) != route.stops.end();
}

// Helper: check if a node type is a valid disposal sink
bool is_disposal_sink(routing::NodeType type) noexcept {
    return type == routing::NodeType::CompostingFacility ||
           type == routing::NodeType::MaterialRecoveryFacility ||
           type == routing::NodeType::Landfill ||
           type == routing::NodeType::TransferStation;
}

} // namespace

TEST_CASE("WasteRoutingEngine: End-to-end multi-vehicle optimization pipeline", "[engine][e2e]") {
    routing::WasteRoutingEngine engine;

    // Node 0: Starting Depot
    engine.add_node(routing::WasteNode{
        .id = 0,
        .type = routing::NodeType::Depot,
        .latitude = 37.7749,
        .longitude = -122.4194,
        .demand = {},
        .service_time_seconds = 0.0
    });

    // Collection Bins (Nodes 1 to 4)
    engine.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 37.7755,
        .longitude = -122.4180,
        .demand = routing::WastePayload{.organic_kg = 50.0},
        .service_time_seconds = 60.0
    });

    engine.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 37.7760,
        .longitude = -122.4170,
        .demand = routing::WastePayload{.dry_non_recyclable_kg = 40.0},
        .service_time_seconds = 60.0
    });

    engine.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 37.7770,
        .longitude = -122.4160,
        .demand = routing::WastePayload{.organic_kg = 70.0},
        .service_time_seconds = 60.0
    });

    engine.add_node(routing::WasteNode{
        .id = 4,
        .type = routing::NodeType::CollectionPoint,
        .latitude = 37.7780,
        .longitude = -122.4150,
        .demand = routing::WastePayload{.dry_recyclable_kg = 30.0},
        .service_time_seconds = 60.0
    });

    // Disposal Facilities (Nodes 5 to 7)
    // Node 5: Composting Facility
    engine.add_node(routing::WasteNode{
        .id = 5,
        .type = routing::NodeType::CompostingFacility,
        .latitude = 37.7800,
        .longitude = -122.4100,
        .demand = {},
        .service_time_seconds = 120.0
    });

    // Node 6: Landfill
    engine.add_node(routing::WasteNode{
        .id = 6,
        .type = routing::NodeType::Landfill,
        .latitude = 37.7820,
        .longitude = -122.4080,
        .demand = {},
        .service_time_seconds = 120.0
    });

    // Node 7: Material Recovery Facility (MRF)
    engine.add_node(routing::WasteNode{
        .id = 7,
        .type = routing::NodeType::MaterialRecoveryFacility,
        .latitude = 37.7840,
        .longitude = -122.4060,
        .demand = {},
        .service_time_seconds = 120.0
    });

    // Add bidirectional edges to form a fully connected road network
    auto add_bidirectional = [&](routing::NodeId u, routing::NodeId v, double dist, double speed = 10.0) {
        engine.add_edge(u, v, dist, speed);
        engine.add_edge(v, u, dist, speed);
    };

    // Depot connects to all collection bins and disposal facilities
    add_bidirectional(0, 1, 300.0);
    add_bidirectional(0, 2, 500.0);
    add_bidirectional(0, 3, 700.0);
    add_bidirectional(0, 4, 900.0);
    add_bidirectional(0, 5, 1200.0);
    add_bidirectional(0, 6, 1500.0);
    add_bidirectional(0, 7, 1800.0);

    // Bins connect to each other in sequence and cross-ways
    add_bidirectional(1, 2, 200.0);
    add_bidirectional(2, 3, 250.0);
    add_bidirectional(3, 4, 300.0);
    add_bidirectional(1, 3, 450.0);
    add_bidirectional(2, 4, 550.0);

    // Bins connect to disposal sinks
    add_bidirectional(1, 5, 800.0);
    add_bidirectional(2, 6, 900.0);
    add_bidirectional(3, 5, 600.0);
    add_bidirectional(4, 7, 750.0);
    add_bidirectional(1, 6, 1100.0);
    add_bidirectional(2, 5, 1000.0);
    add_bidirectional(3, 7, 850.0);
    add_bidirectional(4, 6, 950.0);

    // Disposal sinks interconnect
    add_bidirectional(5, 6, 400.0);
    add_bidirectional(6, 7, 400.0);
    add_bidirectional(5, 7, 700.0);

    // Configure fleet with 2 vehicles
    const routing::WasteVehicle veh1{
        .id = 1,
        .capacity_limits = routing::WastePayload{
            .organic_kg = 300.0,
            .dry_recyclable_kg = 300.0,
            .dry_non_recyclable_kg = 300.0,
            .hazardous_ewaste_kg = 100.0
        },
        .max_shift_duration_seconds = 28800.0
    };

    const routing::WasteVehicle veh2{
        .id = 2,
        .capacity_limits = routing::WastePayload{
            .organic_kg = 300.0,
            .dry_recyclable_kg = 300.0,
            .dry_non_recyclable_kg = 300.0,
            .hazardous_ewaste_kg = 100.0
        },
        .max_shift_duration_seconds = 28800.0
    };

    engine.add_vehicle(veh1);
    engine.add_vehicle(veh2);
    engine.set_starting_depot(0);

    REQUIRE_FALSE(engine.is_graph_sealed());
    REQUIRE(engine.fleet().size() == 2);
    REQUIRE(engine.starting_depot() == 0);

    // Execute pipeline for unassigned bins {1, 2, 3, 4}
    const std::vector<routing::NodeId> bins = {1, 2, 3, 4};
    const routing::FleetSolution solution = engine.solve(bins);

    // Post-solve verification: graph is sealed and valid
    REQUIRE(engine.is_graph_sealed());
    REQUIRE(engine.graph().has_value());
    const auto& graph = *engine.graph();
    REQUIRE(graph.node_count() == 8);

    // Verification 1: Solution must be non-empty
    REQUIRE_FALSE(solution.routes.empty());

    // Verification 2: All unassigned bins must be serviced in the fleet solution
    for (const auto bin_id : bins) {
        bool serviced = false;
        for (const auto& route : solution.routes) {
            if (route_contains_stop(route, bin_id)) {
                serviced = true;
                break;
            }
        }
        CHECK(serviced);
    }

    // Verification 3: Every route must start at depot 0 and end at a disposal sink
    const routing::CostEvaluator evaluator;
    for (const auto& route : solution.routes) {
        REQUIRE(route.size() >= 2);
        CHECK(route.start_node() == 0);

        const auto end_node_id = route.end_node();
        const auto end_node_type = graph.node(end_node_id).type;
        CHECK(is_disposal_sink(end_node_type));

        // Check metrics
        CHECK(route.total_distance_meters > 0.0);
        CHECK(route.total_duration_seconds > 0.0);

        // Find the matching vehicle for this route
        const auto veh_it = std::find_if(engine.fleet().begin(), engine.fleet().end(),
                                         [&](const routing::WasteVehicle& v) noexcept {
                                             return v.id == route.vehicle_id;
                                         });
        REQUIRE(veh_it != engine.fleet().end());
        CHECK(routing::is_route_feasible(route, *veh_it, graph, evaluator));
    }

    // Verification 4: Fleet aggregate metrics
    CHECK(solution.total_distance_meters() > 0.0);
    CHECK(solution.total_duration_seconds() > 0.0);
}

TEST_CASE("WasteRoutingEngine: Graph sealing semantics and idempotency", "[engine][sealing]") {
    routing::WasteRoutingEngine engine;

    engine.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    engine.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 20.0}
    });
    engine.add_node(routing::WasteNode{.id = 2, .type = routing::NodeType::CompostingFacility});

    engine.add_edge(0, 1, 100.0, 10.0);
    engine.add_edge(1, 2, 100.0, 10.0);
    engine.add_edge(0, 2, 200.0, 10.0);

    engine.add_vehicle(routing::WasteVehicle{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 500.0},
        .max_shift_duration_seconds = 28800.0
    });
    engine.set_starting_depot(0);

    CHECK_FALSE(engine.is_graph_sealed());

    // First solve triggers sealing
    const auto sol1 = engine.solve({1});
    CHECK(engine.is_graph_sealed());
    REQUIRE_FALSE(sol1.routes.empty());

    // Post-seal mutations must throw std::logic_error
    CHECK_THROWS_AS(engine.add_node(routing::WasteNode{.id = 3, .type = routing::NodeType::Landfill}),
                    std::logic_error);
    CHECK_THROWS_AS(engine.add_edge(1, 0, 100.0, 10.0), std::logic_error);

    // Consecutive solve() call reuses the existing sealed graph idempotently
    const auto sol2 = engine.solve({1});
    CHECK(engine.is_graph_sealed());
    CHECK(sol1 == sol2);
}

TEST_CASE("WasteRoutingEngine: Multi-vehicle handoff under shift duration limit", "[engine][shift_limit]") {
    routing::WasteRoutingEngine engine;

    // Node 0: Depot
    engine.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Node 1: Collection point near
    engine.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 10.0},
        .service_time_seconds = 100.0
    });
    // Node 2: Collection point far
    engine.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 10.0},
        .service_time_seconds = 100.0
    });
    // Node 3: Composting facility
    engine.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::CompostingFacility,
        .service_time_seconds = 0.0
    });

    auto add_bidirectional = [&](routing::NodeId u, routing::NodeId v, double dist, double speed = 10.0) {
        engine.add_edge(u, v, dist, speed);
        engine.add_edge(v, u, dist, speed);
    };

    add_bidirectional(0, 1, 100.0);   // 10s
    add_bidirectional(0, 2, 10000.0); // 1000s
    add_bidirectional(0, 3, 50.0);
    add_bidirectional(1, 3, 200.0);
    add_bidirectional(2, 3, 300.0);
    add_bidirectional(1, 2, 9900.0);

    // Vehicle 1 has very small shift budget (300s): can only serve Stop 1
    engine.add_vehicle(routing::WasteVehicle{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 500.0},
        .max_shift_duration_seconds = 300.0
    });

    // Vehicle 2 has shift budget sufficient for Stop 2 alone (1130s), but not both stops (1230s)
    engine.add_vehicle(routing::WasteVehicle{
        .id = 2,
        .capacity_limits = routing::WastePayload{.organic_kg = 500.0},
        .max_shift_duration_seconds = 1150.0
    });

    engine.set_starting_depot(0);

    const auto solution = engine.solve({1, 2});

    // Both vehicles must have been mobilized
    REQUIRE(solution.routes.size() == 2);
    CHECK(solution.routes[0].vehicle_id == 1);
    CHECK(solution.routes[1].vehicle_id == 2);

    CHECK(route_contains_stop(solution.routes[0], 1));
    CHECK_FALSE(route_contains_stop(solution.routes[0], 2));

    CHECK(route_contains_stop(solution.routes[1], 2));
}

TEST_CASE("WasteRoutingEngine: Edge cases with empty input or empty fleet", "[engine][edge_cases]") {
    routing::WasteRoutingEngine engine;

    engine.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    engine.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CompostingFacility});
    engine.add_edge(0, 1, 100.0, 10.0);
    engine.set_starting_depot(0);

    // Case 1: Empty fleet
    const auto sol_no_fleet = engine.solve({1});
    CHECK(sol_no_fleet.routes.empty());

    // Case 2: Add vehicle, but empty stops
    engine.add_vehicle(routing::WasteVehicle{
        .id = 1,
        .capacity_limits = routing::WastePayload{.organic_kg = 500.0},
        .max_shift_duration_seconds = 28800.0
    });

    const auto sol_no_stops = engine.solve({});
    CHECK(sol_no_stops.routes.empty());
}
