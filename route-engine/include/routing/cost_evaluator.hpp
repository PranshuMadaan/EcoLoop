#pragma once

#include <routing/common.hpp>
#include <routing/graph.hpp>
#include <routing/route.hpp>

#include <cstddef>
#include <limits>

namespace routing {

struct PathMetrics {
    double distance_meters{0.0};
    double duration_seconds{0.0};
    bool reachable{true};
};

// Evaluates the cost, distance, and duration of routes over a DirectedGraph
class CostEvaluator {
public:
    static constexpr double kDefaultUnreachablePenalty = 1e9;

    explicit CostEvaluator(double unreachable_penalty = kDefaultUnreachablePenalty) noexcept
        : unreachable_penalty_(unreachable_penalty) {}

    [[nodiscard]] double unreachable_penalty() const noexcept { return unreachable_penalty_; }

    // Evaluates path metrics between two stops (direct edge lookup with Dijkstra shortest path fallback)
    [[nodiscard]] PathMetrics find_leg_metrics(NodeId from, NodeId to, const DirectedGraph& graph) const;

    // Computes overall objective cost for a given route sequence
    [[nodiscard]] double compute_cost(const Route& route, const DirectedGraph& graph) const;

    // Updates route's total_distance_meters and total_duration_seconds fields
    void update_route_metrics(Route& route, const DirectedGraph& graph) const;

private:
    double unreachable_penalty_{kDefaultUnreachablePenalty};
};

} // namespace routing
