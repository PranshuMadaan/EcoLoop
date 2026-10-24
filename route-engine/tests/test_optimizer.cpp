#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>
#include <routing/optimizer.hpp>
#include <routing/route.hpp>

#include <stdexcept>
#include <vector>

using Catch::Matchers::WithinRel;

TEST_CASE("Route abstraction basic properties and intermediate stops", "[route]") {
    routing::Route empty_route;
    REQUIRE(empty_route.empty());
    REQUIRE(empty_route.size() == 0);
    REQUIRE_THROWS_AS(empty_route.start_node(), std::out_of_range);
    REQUIRE_THROWS_AS(empty_route.end_node(), std::out_of_range);
    REQUIRE(empty_route.intermediate_stops().empty());

    routing::Route single(1, {0});
    REQUIRE(single.size() == 1);
    REQUIRE(single.start_node() == 0);
    REQUIRE(single.end_node() == 0);
    REQUIRE(single.intermediate_stops().empty());

    routing::Route pair_route(1, {0, 5});
    REQUIRE(pair_route.size() == 2);
    REQUIRE(pair_route.start_node() == 0);
    REQUIRE(pair_route.end_node() == 5);
    REQUIRE(pair_route.intermediate_stops().empty());

    routing::Route triple(1, {0, 1, 5});
    REQUIRE(triple.size() == 3);
    REQUIRE(triple.start_node() == 0);
    REQUIRE(triple.end_node() == 5);
    auto inter_triple = triple.intermediate_stops();
    REQUIRE(inter_triple.size() == 1);
    CHECK(inter_triple[0] == 1);

    routing::Route quad(1, {10, 20, 30, 40});
    auto inter_quad = quad.intermediate_stops();
    REQUIRE(inter_quad.size() == 2);
    CHECK(inter_quad[0] == 20);
    CHECK(inter_quad[1] == 30);

    quad.clear();
    REQUIRE(quad.empty());
    REQUIRE(quad.total_distance_meters == 0.0);
    REQUIRE(quad.total_duration_seconds == 0.0);
}

TEST_CASE("CostEvaluator with direct edges and Dijkstra shortest path fallback", "[cost_evaluator]") {
    routing::GraphBuilder builder;

    // Build a 4-node line graph: 0 -> 1 -> 2 -> 3
    builder.add_node(routing::WasteNode{.id = 0, .service_time_seconds = 60.0});
    builder.add_node(routing::WasteNode{.id = 1, .service_time_seconds = 120.0});
    builder.add_node(routing::WasteNode{.id = 2, .service_time_seconds = 180.0});
    builder.add_node(routing::WasteNode{.id = 3, .service_time_seconds = 240.0});

    builder.add_edge(0, 1, 1000.0, 10.0); // 100 sec
    builder.add_edge(1, 2, 2000.0, 20.0); // 100 sec
    builder.add_edge(2, 3, 3000.0, 15.0); // 200 sec

    const auto graph = builder.build();
    routing::CostEvaluator evaluator;

    SECTION("Direct consecutive edge evaluation") {
        routing::Route direct_route(1, {0, 1, 2, 3});
        const double cost = evaluator.compute_cost(direct_route, graph);
        REQUIRE_THAT(cost, WithinRel(6000.0, 1e-9));

        evaluator.update_route_metrics(direct_route, graph);
        REQUIRE_THAT(direct_route.total_distance_meters, WithinRel(6000.0, 1e-9));
        // duration = travel time (100 + 100 + 200 = 400s) + service times (60 + 120 + 180 + 240 = 600s) = 1000s
        REQUIRE_THAT(direct_route.total_duration_seconds, WithinRel(1000.0, 1e-9));
    }

    SECTION("Dijkstra multi-hop fallback when direct edge is omitted") {
        // Stops sequence is 0 -> 3 directly, but graph only has 0 -> 1 -> 2 -> 3
        routing::Route hop_route(1, {0, 3});
        const double cost = evaluator.compute_cost(hop_route, graph);
        REQUIRE_THAT(cost, WithinRel(6000.0, 1e-9));

        evaluator.update_route_metrics(hop_route, graph);
        REQUIRE_THAT(hop_route.total_distance_meters, WithinRel(6000.0, 1e-9));
        // duration = travel time (400s) + service times for stops {0, 3} (60 + 240 = 300s) = 700s
        REQUIRE_THAT(hop_route.total_duration_seconds, WithinRel(700.0, 1e-9));
    }

    SECTION("Unreachable node assigns penalty") {
        routing::Route unreachable_route(1, {3, 0}); // 3 -> 0 has no directed path
        const double cost = evaluator.compute_cost(unreachable_route, graph);
        REQUIRE(cost >= evaluator.unreachable_penalty());
    }
}

TEST_CASE("RouteOptimizer 2-Opt: Crossed path uncrossing", "[optimizer][2opt]") {
    routing::GraphBuilder builder;

    // Geometric planar setup:
    // Node 0: Depot (0, 0)
    // Node 1: Collection A (0, 1000)
    // Node 2: Collection B (1000, 1000)
    // Node 3: Collection C (1000, 0)
    // Node 4: Landfill (0, 0)
    for (routing::NodeId i = 0; i < 5; ++i) {
        builder.add_node(routing::WasteNode{.id = i});
    }

    // Bidirectional perimeter edges (perimeter distance = 1000m each)
    auto add_bi_edge = [&](routing::NodeId u, routing::NodeId v, double dist, double speed) {
        builder.add_edge(u, v, dist, speed);
        builder.add_edge(v, u, dist, speed);
    };

    add_bi_edge(0, 1, 1000.0, 10.0);
    add_bi_edge(1, 2, 1000.0, 10.0);
    add_bi_edge(2, 3, 1000.0, 10.0);
    add_bi_edge(3, 4, 1000.0, 10.0);
    add_bi_edge(4, 0, 10.0, 10.0);

    // Diagonal crossing edges: 1 <-> 3 and 0 <-> 2 (~1414.2m)
    add_bi_edge(1, 3, 1414.2, 10.0);
    add_bi_edge(0, 2, 1414.2, 10.0);
    add_bi_edge(2, 4, 1414.2, 10.0);

    const auto graph = builder.build();
    routing::RouteOptimizer optimizer;

    // Initial crossed tour: 0 -> 1 -> 3 -> 2 -> 4
    // Legs:
    // 0 -> 1 : 1000m
    // 1 -> 3 : 1414.2m (diagonal cross)
    // 3 -> 2 : 1000m
    // 2 -> 4 : 1414.2m (diagonal cross)
    // Total cost = 1000 + 1414.2 + 1000 + 1414.2 = 4828.4m
    const routing::Route crossed_route(1, {0, 1, 3, 2, 4});
    const double initial_cost = optimizer.evaluator().compute_cost(crossed_route, graph);
    REQUIRE_THAT(initial_cost, WithinRel(4828.4, 1e-3));

    // Optimize route
    const routing::Route opt_route = optimizer.optimize_route(crossed_route, graph);

    // Expected uncrossed tour: 0 -> 1 -> 2 -> 3 -> 4
    // Cost: 1000 + 1000 + 1000 + 1000 = 4000.0m
    const std::vector<routing::NodeId> expected_stops = {0, 1, 2, 3, 4};
    REQUIRE(opt_route.stops == expected_stops);
    REQUIRE_THAT(opt_route.total_distance_meters, WithinRel(4000.0, 1e-3));
    REQUIRE(opt_route.total_distance_meters < initial_cost);
}

TEST_CASE("RouteOptimizer: Fixed endpoints guarantee", "[optimizer][endpoints]") {
    routing::GraphBuilder builder;

    for (routing::NodeId i = 0; i < 6; ++i) {
        builder.add_node(routing::WasteNode{.id = i});
    }

    // Connect fully connected mesh
    for (routing::NodeId u = 0; u < 6; ++u) {
        for (routing::NodeId v = 0; v < 6; ++v) {
            if (u != v) {
                builder.add_edge(u, v, 500.0, 10.0);
            }
        }
    }

    const auto graph = builder.build();
    routing::RouteOptimizer optimizer;

    const routing::Route initial(42, {0, 3, 1, 4, 2, 5});
    const routing::Route optimized = optimizer.optimize_route(initial, graph);

    // First stop (depot) and last stop (dump/landfill) must never be altered
    REQUIRE(optimized.start_node() == 0);
    REQUIRE(optimized.end_node() == 5);
    REQUIRE(optimized.stops.front() == 0);
    REQUIRE(optimized.stops.back() == 5);
    REQUIRE(optimized.size() == initial.size());
}

TEST_CASE("RouteOptimizer: Edge cases with <= 3 stops", "[optimizer][edge_cases]") {
    routing::GraphBuilder builder;
    builder.add_node(routing::WasteNode{.id = 0});
    builder.add_node(routing::WasteNode{.id = 1});
    builder.add_node(routing::WasteNode{.id = 2});
    builder.add_edge(0, 1, 100.0, 10.0);
    builder.add_edge(1, 2, 200.0, 10.0);

    const auto graph = builder.build();
    routing::RouteOptimizer optimizer;

    SECTION("Empty route") {
        const routing::Route empty_r;
        const auto res = optimizer.optimize_route(empty_r, graph);
        REQUIRE(res.empty());
        REQUIRE(res.total_distance_meters == 0.0);
    }

    SECTION("Single stop route") {
        const routing::Route single(1, {0});
        const auto res = optimizer.optimize_route(single, graph);
        REQUIRE(res.size() == 1);
        REQUIRE(res.stops[0] == 0);
    }

    SECTION("Two stops route") {
        const routing::Route two_stops(1, {0, 1});
        const auto res = optimizer.optimize_route(two_stops, graph);
        REQUIRE(res.size() == 2);
        REQUIRE(res.stops[0] == 0);
        REQUIRE(res.stops[1] == 1);
        REQUIRE_THAT(res.total_distance_meters, WithinRel(100.0, 1e-9));
    }

    SECTION("Three stops route") {
        const routing::Route three_stops(1, {0, 1, 2});
        const auto res = optimizer.optimize_route(three_stops, graph);
        REQUIRE(res.size() == 3);
        REQUIRE(res.stops[0] == 0);
        REQUIRE(res.stops[1] == 1);
        REQUIRE(res.stops[2] == 2);
        REQUIRE_THAT(res.total_distance_meters, WithinRel(300.0, 1e-9));
    }
}

TEST_CASE("RouteOptimizer: Directed graph feasibility and one-way constraints", "[optimizer][directed]") {
    routing::GraphBuilder builder;

    for (routing::NodeId i = 0; i < 5; ++i) {
        builder.add_node(routing::WasteNode{.id = i});
    }

    // Path 0 -> 1 -> 2 -> 3 -> 4 exists
    builder.add_edge(0, 1, 100.0, 10.0);
    builder.add_edge(1, 2, 100.0, 10.0);
    builder.add_edge(2, 3, 100.0, 10.0);
    builder.add_edge(3, 4, 100.0, 10.0);

    // If reversed (e.g. 2 -> 1 or 3 -> 2), there are NO reverse edges
    // Reversing [1, 2] would create 0 -> 2 -> 1 -> 3 -> 4
    // Suppose 0 -> 2 exists with short distance (10.0), but 2 -> 1 does NOT exist!
    builder.add_edge(0, 2, 10.0, 10.0); // tempting swap, but 2 -> 1 is impossible

    const auto graph = builder.build();
    routing::RouteOptimizer optimizer;

    const std::vector<routing::NodeId> raw = {0, 1, 2, 3, 4};
    const auto res = optimizer.add_and_optimize(raw, graph, 7);

    // The optimizer must not perform the invalid reversal, maintaining feasible sequence
    REQUIRE(res.stops == raw);
    REQUIRE_THAT(res.total_distance_meters, WithinRel(400.0, 1e-9));
}
