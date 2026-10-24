#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/fleet_optimizer.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>
#include <routing/route.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <vector>

using Catch::Matchers::WithinRel;

TEST_CASE("WasteVehicle capacity and shift limits", "[vehicle]") {
    const routing::WasteVehicle vehicle{
        .id = 1,
        .capacity_limits = routing::WastePayload{
            .organic_kg = 500.0,
            .dry_recyclable_kg = 300.0,
            .dry_non_recyclable_kg = 200.0,
            .hazardous_ewaste_kg = 50.0
        },
        .max_shift_duration_seconds = 28800.0
    };

    REQUIRE(vehicle.max_shift_duration_seconds == 28800.0);

    // Completely within capacity
    const routing::WastePayload valid_payload{
        .organic_kg = 400.0,
        .dry_recyclable_kg = 250.0,
        .dry_non_recyclable_kg = 150.0,
        .hazardous_ewaste_kg = 40.0
    };
    CHECK(vehicle.can_carry(valid_payload));

    // Exactly at capacity limits
    CHECK(vehicle.can_carry(vehicle.capacity_limits));

    // Exceeding organic stream limit
    const routing::WastePayload over_organic{
        .organic_kg = 500.1,
        .dry_recyclable_kg = 200.0,
        .dry_non_recyclable_kg = 100.0,
        .hazardous_ewaste_kg = 10.0
    };
    CHECK_FALSE(vehicle.can_carry(over_organic));

    // Exceeding hazardous stream limit
    const routing::WastePayload over_hazardous{
        .organic_kg = 100.0,
        .dry_recyclable_kg = 100.0,
        .dry_non_recyclable_kg = 100.0,
        .hazardous_ewaste_kg = 50.1
    };
    CHECK_FALSE(vehicle.can_carry(over_hazardous));
}

TEST_CASE("Route payload accumulation and feasibility checker", "[solution][feasibility]") {
    routing::GraphBuilder builder;

    // Node 0: Depot (start) - demands must be ignored
    builder.add_node(routing::WasteNode{
        .id = 0,
        .type = routing::NodeType::Depot,
        .demand = routing::WastePayload{.organic_kg = 9999.0}
    });

    // Node 1: Intermediate stop A
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 150.0, .dry_recyclable_kg = 50.0},
        .service_time_seconds = 300.0
    });

    // Node 2: Intermediate stop B
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.organic_kg = 100.0, .dry_recyclable_kg = 75.0},
        .service_time_seconds = 300.0
    });

    // Node 3: Landfill (end) - demands must be ignored
    builder.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::Landfill,
        .demand = routing::WastePayload{.dry_recyclable_kg = 8888.0}
    });

    builder.add_edge(0, 1, 1000.0, 10.0); // 100s
    builder.add_edge(1, 2, 1000.0, 10.0); // 100s
    builder.add_edge(2, 3, 1000.0, 10.0); // 100s

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;

    const routing::Route route(10, {0, 1, 2, 3});

    SECTION("Payload calculates intermediate demand only") {
        const auto payload = routing::compute_route_payload(route, graph);
        CHECK_THAT(payload.organic_kg, WithinRel(250.0, 1e-9));
        CHECK_THAT(payload.dry_recyclable_kg, WithinRel(125.0, 1e-9));
        CHECK_THAT(payload.dry_non_recyclable_kg, WithinRel(0.0, 1e-9));
        CHECK_THAT(payload.hazardous_ewaste_kg, WithinRel(0.0, 1e-9));
        CHECK_THAT(payload.total_kg(), WithinRel(375.0, 1e-9));
    }

    SECTION("Route is feasible when within capacity and shift limits") {
        const routing::WasteVehicle veh_ok{
            .id = 10,
            .capacity_limits = routing::WastePayload{.organic_kg = 300.0, .dry_recyclable_kg = 200.0},
            .max_shift_duration_seconds = 1800.0 // route total duration = 300s travel + 600s service = 900s
        };
        CHECK(routing::is_route_feasible(route, veh_ok, graph, evaluator));
    }

    SECTION("Route is infeasible when capacity is exceeded") {
        const routing::WasteVehicle veh_small{
            .id = 10,
            .capacity_limits = routing::WastePayload{.organic_kg = 200.0, .dry_recyclable_kg = 200.0}, // needs 250 organic
            .max_shift_duration_seconds = 3600.0
        };
        CHECK_FALSE(routing::is_route_feasible(route, veh_small, graph, evaluator));
    }

    SECTION("Route is infeasible when shift duration is exceeded") {
        const routing::WasteVehicle veh_short_shift{
            .id = 10,
            .capacity_limits = routing::WastePayload{.organic_kg = 1000.0, .dry_recyclable_kg = 1000.0},
            .max_shift_duration_seconds = 500.0 // route needs 900s
        };
        CHECK_FALSE(routing::is_route_feasible(route, veh_short_shift, graph, evaluator));
    }
}

TEST_CASE("FleetOptimizer: Relocate operator moves clustered stop to nearest route", "[fleet][relocate]") {
    routing::GraphBuilder builder;

    // Region 1: Depot 0, Stop 1, Landfill 2 (all at x ~ 0)
    // Region 2: Depot 3, Stop 4, Landfill 5 (all at x ~ 1000)
    // Stop 6: Misassigned stop located in Region 2 (x ~ 1000), currently in Route 1!
    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    builder.add_node(routing::WasteNode{.id = 1, .type = routing::NodeType::CollectionPoint});
    builder.add_node(routing::WasteNode{.id = 2, .type = routing::NodeType::Landfill});

    builder.add_node(routing::WasteNode{.id = 3, .type = routing::NodeType::Depot});
    builder.add_node(routing::WasteNode{.id = 4, .type = routing::NodeType::CollectionPoint});
    builder.add_node(routing::WasteNode{.id = 5, .type = routing::NodeType::Landfill});

    builder.add_node(routing::WasteNode{.id = 6, .type = routing::NodeType::CollectionPoint});

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };

    // Region 1 local edges (short distance ~ 50m)
    add_bi(0, 1, 50.0);
    add_bi(1, 2, 50.0);
    add_bi(0, 2, 80.0);

    // Region 2 local edges (short distance ~ 50m)
    add_bi(3, 4, 50.0);
    add_bi(4, 5, 50.0);
    add_bi(4, 6, 40.0);
    add_bi(3, 6, 60.0);
    add_bi(6, 5, 60.0);

    // Cross-region edges between Region 1 and Stop 6 (long distance ~ 1000m)
    add_bi(1, 6, 1000.0);
    add_bi(6, 2, 1000.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FleetOptimizer optimizer(graph, evaluator);

    const std::vector<routing::WasteVehicle> fleet = {
        routing::WasteVehicle{.id = 1, .capacity_limits = routing::WastePayload{1000, 1000, 1000, 1000}},
        routing::WasteVehicle{.id = 2, .capacity_limits = routing::WastePayload{1000, 1000, 1000, 1000}}
    };

    // Initial state:
    // Route 1 (vehicle 1) has stops: 0 -> 1 -> 6 -> 2 (crosses regions, 50 + 1000 + 1000 = 2050m)
    // Route 2 (vehicle 2) has stops: 3 -> 4 -> 5 (local, 50 + 50 = 100m)
    // Total fleet distance = 2150m
    routing::FleetSolution solution;
    solution.routes.push_back(routing::Route(1, {0, 1, 6, 2}));
    solution.routes.push_back(routing::Route(2, {3, 4, 5}));

    const double initial_distance = evaluator.compute_cost(solution.routes[0], graph) +
                                    evaluator.compute_cost(solution.routes[1], graph);
    REQUIRE_THAT(initial_distance, WithinRel(2150.0, 1e-3));

    const auto optimized = optimizer.optimize(solution, fleet);

    // Stop 6 should be relocated from Route 1 to Route 2
    // Route 1 becomes: 0 -> 1 -> 2 (cost = 100m)
    // Route 2 becomes: 3 -> 4 -> 6 -> 5 (cost = 50 + 40 + 60 = 150m)
    // Total fleet distance ~ 250m!
    const double final_distance = evaluator.compute_cost(optimized.routes[0], graph) +
                                  evaluator.compute_cost(optimized.routes[1], graph);

    CHECK(final_distance < 300.0);
    CHECK(final_distance < initial_distance);

    // Route 1 endpoints preserved
    CHECK(optimized.routes[0].start_node() == 0);
    CHECK(optimized.routes[0].end_node() == 2);
    // Route 2 endpoints preserved
    CHECK(optimized.routes[1].start_node() == 3);
    CHECK(optimized.routes[1].end_node() == 5);

    // Stop 6 is no longer in Route 1
    const auto r1_inter = optimized.routes[0].intermediate_stops();
    for (auto node_id : r1_inter) {
        CHECK(node_id != 6);
    }
}

TEST_CASE("FleetOptimizer: Swap operator exchanges crossed stops between routes", "[fleet][swap]") {
    routing::GraphBuilder builder;

    // Region 1: Depot 0, Collection 1, Dump 2
    // Region 2: Depot 3, Collection 4, Dump 5
    // Stop 6 is in Region 2, but placed in Route 1
    // Stop 7 is in Region 1, but placed in Route 2
    for (routing::NodeId i = 0; i < 8; ++i) {
        builder.add_node(routing::WasteNode{.id = i});
    }

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };

    // Region 1 intra-connections (nodes 0, 1, 7, 2)
    add_bi(0, 1, 50.0);
    add_bi(1, 7, 50.0);
    add_bi(7, 2, 50.0);
    add_bi(1, 2, 80.0);

    // Region 2 intra-connections (nodes 3, 4, 6, 5)
    add_bi(3, 4, 50.0);
    add_bi(4, 6, 50.0);
    add_bi(6, 5, 50.0);
    add_bi(4, 5, 80.0);

    // Long inter-region cross edges
    add_bi(1, 6, 1200.0);
    add_bi(6, 2, 1200.0);
    add_bi(4, 7, 1200.0);
    add_bi(7, 5, 1200.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FleetOptimizer optimizer(graph, evaluator);

    const std::vector<routing::WasteVehicle> fleet = {
        routing::WasteVehicle{.id = 1, .capacity_limits = routing::WastePayload{1000, 1000, 1000, 1000}},
        routing::WasteVehicle{.id = 2, .capacity_limits = routing::WastePayload{1000, 1000, 1000, 1000}}
    };

    // Cross-territory initial routes:
    // Route 1: 0 -> 1 -> 6 -> 2 (6 belongs to region 2)
    // Route 2: 3 -> 4 -> 7 -> 5 (7 belongs to region 1)
    routing::FleetSolution initial;
    initial.routes.push_back(routing::Route(1, {0, 1, 6, 2}));
    initial.routes.push_back(routing::Route(2, {3, 4, 7, 5}));

    const double initial_cost = evaluator.compute_cost(initial.routes[0], graph) +
                                evaluator.compute_cost(initial.routes[1], graph);

    const auto optimized = optimizer.optimize(initial, fleet);

    const double optimized_cost = evaluator.compute_cost(optimized.routes[0], graph) +
                                  evaluator.compute_cost(optimized.routes[1], graph);

    CHECK(optimized_cost < initial_cost);
    // Swapping 6 and 7 yields optimal intra-region tours:
    // Route 1: 0 -> 1 -> 7 -> 2 (cost = 150m)
    // Route 2: 3 -> 4 -> 6 -> 5 (cost = 150m)
    CHECK_THAT(optimized_cost, WithinRel(300.0, 1e-3));
}

TEST_CASE("FleetOptimizer: Rejects moves violating capacity constraint", "[fleet][capacity_constraint]") {
    routing::GraphBuilder builder;

    // Two routes
    for (routing::NodeId i = 0; i < 6; ++i) {
        builder.add_node(routing::WasteNode{
            .id = i,
            .demand = (i == 1) ? routing::WastePayload{.organic_kg = 500.0} : routing::WastePayload{}
        });
    }

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };

    add_bi(0, 1, 100.0);
    add_bi(1, 2, 100.0);
    add_bi(0, 2, 10.0);

    add_bi(3, 4, 50.0);
    add_bi(4, 5, 50.0);
    add_bi(4, 1, 10.0); // Stop 1 is very close to Route 2!
    add_bi(1, 5, 10.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::FleetOptimizer optimizer(graph, evaluator);

    // Vehicle 2 has very small capacity (organic_kg = 100.0), so it CANNOT accept stop 1 (500kg)
    const std::vector<routing::WasteVehicle> fleet = {
        routing::WasteVehicle{.id = 1, .capacity_limits = routing::WastePayload{1000, 1000, 1000, 1000}},
        routing::WasteVehicle{.id = 2, .capacity_limits = routing::WastePayload{.organic_kg = 100.0}}
    };

    routing::FleetSolution initial;
    initial.routes.push_back(routing::Route(1, {0, 1, 2}));
    initial.routes.push_back(routing::Route(2, {3, 4, 5}));

    const auto optimized = optimizer.optimize(initial, fleet);

    // Stop 1 must NOT be transferred to Route 2 because Vehicle 2 exceeds capacity
    const auto r2_inter = optimized.routes[1].intermediate_stops();
    for (auto node_id : r2_inter) {
        CHECK(node_id != 1);
    }
}

TEST_CASE("RouteOptimizer: 2-Opt cannot reorder disposal behind the load that needs it", "[optimizer][feasibility]") {
    routing::GraphBuilder builder;

    builder.add_node(routing::WasteNode{.id = 0, .type = routing::NodeType::Depot});
    // Stop 1: 120 kg e-waste
    builder.add_node(routing::WasteNode{
        .id = 1,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.hazardous_ewaste_kg = 120.0},
        .service_time_seconds = 60.0
    });
    // Stop 2: 100 kg e-waste — 120 + 100 > 200 cap, so a dump must sit between them
    builder.add_node(routing::WasteNode{
        .id = 2,
        .type = routing::NodeType::CollectionPoint,
        .demand = routing::WastePayload{.hazardous_ewaste_kg = 100.0},
        .service_time_seconds = 60.0
    });
    // Node 3: TransferStation (hazardous e-waste sink)
    builder.add_node(routing::WasteNode{
        .id = 3,
        .type = routing::NodeType::TransferStation,
        .service_time_seconds = 30.0
    });

    auto add_bi = [&](routing::NodeId u, routing::NodeId v, double d) {
        builder.add_edge(u, v, d, 10.0);
        builder.add_edge(v, u, d, 10.0);
    };
    add_bi(0, 1, 1000.0);
    add_bi(0, 2, 2000.0);
    add_bi(0, 3, 1500.0);
    add_bi(1, 2, 1000.0);
    add_bi(1, 3, 800.0);
    add_bi(2, 3, 900.0);

    const auto graph = builder.build();
    const routing::CostEvaluator evaluator;
    const routing::RouteOptimizer route_optimizer(evaluator);

    const routing::WasteVehicle veh{
        .id = 1,
        .capacity_limits = routing::WastePayload{1000.0, 1000.0, 1000.0, 200.0},
        .max_shift_duration_seconds = 28800.0
    };

    // Feasible initial route: collect 1, dump at 3, collect 2, terminal dump, home
    const routing::Route initial(1, {0, 1, 3, 2, 3, 0});
    const auto optimized = route_optimizer.optimize_route(initial, graph, veh);

    // The cheaper reorder [0,1,2,3,3,0] (4400 m) would carry 220 kg on a 200 kg
    // truck and must be rejected; the result must stay legal and cheap or equal
    CHECK(routing::is_route_feasible(optimized, veh, graph, evaluator));
    CHECK(optimized.stops.front() == 0);
    CHECK(optimized.stops.back() == 0);
    CHECK(optimized.total_distance_meters <= evaluator.compute_cost(initial, graph) + 1e-6);

    bool has_both_stops = false;
    std::size_t count_1 = 0;
    std::size_t count_2 = 0;
    for (const auto s : optimized.stops) {
        count_1 += (s == 1) ? 1 : 0;
        count_2 += (s == 2) ? 1 : 0;
    }
    has_both_stops = (count_1 == 1 && count_2 == 1);
    CHECK(has_both_stops);

    // Peak-load model: dumping resets the e-waste compartment
    const routing::Route legal_order(1, {0, 1, 3, 2, 3, 0});
    const routing::Route illegal_order(1, {0, 1, 2, 3, 3, 0});
    CHECK(routing::route_peak_load(legal_order, graph).hazardous_ewaste_kg == 120.0);
    CHECK(routing::route_peak_load(illegal_order, graph).hazardous_ewaste_kg == 220.0);
}
