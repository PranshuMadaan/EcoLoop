#include <routing/cost_evaluator.hpp>

#include <queue>
#include <utility>
#include <vector>

namespace routing {

PathMetrics CostEvaluator::find_leg_metrics(NodeId from, NodeId to, const DirectedGraph& graph) const {
    if (from == to) {
        return {0.0, 0.0, true};
    }

    const std::size_t n = graph.node_count();
    if (static_cast<std::size_t>(from) >= n || static_cast<std::size_t>(to) >= n) {
        return {unreachable_penalty_, unreachable_penalty_, false};
    }

    // Fast-path: check direct outgoing edge
    const auto outgoing = graph.outgoing_edges(from);
    bool has_direct = false;
    double best_direct_dist = std::numeric_limits<double>::infinity();
    double best_direct_time = std::numeric_limits<double>::infinity();

    for (const auto& edge : outgoing) {
        if (edge.target == to) {
            has_direct = true;
            if (edge.distance_meters < best_direct_dist) {
                best_direct_dist = edge.distance_meters;
                const double speed = (edge.speed_mps > 0.0) ? edge.speed_mps : constants::kMinAllowedSpeedMps;
                best_direct_time = edge.distance_meters / speed;
            }
        }
    }

    if (has_direct) {
        return {best_direct_dist, best_direct_time, true};
    }

    // Dijkstra shortest path fallback if no direct edge exists
    std::vector<double> min_dist(n, std::numeric_limits<double>::infinity());
    std::vector<double> min_time(n, std::numeric_limits<double>::infinity());

    using DistNode = std::pair<double, NodeId>;
    std::priority_queue<DistNode, std::vector<DistNode>, std::greater<DistNode>> pq;

    const auto from_idx = static_cast<std::size_t>(from);
    const auto to_idx = static_cast<std::size_t>(to);

    min_dist[from_idx] = 0.0;
    min_time[from_idx] = 0.0;
    pq.push({0.0, from});

    while (!pq.empty()) {
        const auto [dist, u] = pq.top();
        pq.pop();

        if (u == to) {
            return {min_dist[to_idx], min_time[to_idx], true};
        }

        const auto u_idx = static_cast<std::size_t>(u);
        if (dist > min_dist[u_idx]) {
            continue;
        }

        for (const auto& edge : graph.outgoing_edges(u)) {
            const auto v = edge.target;
            const auto v_idx = static_cast<std::size_t>(v);
            const double cand_dist = dist + edge.distance_meters;

            if (cand_dist < min_dist[v_idx]) {
                min_dist[v_idx] = cand_dist;
                const double speed = (edge.speed_mps > 0.0) ? edge.speed_mps : constants::kMinAllowedSpeedMps;
                min_time[v_idx] = min_time[u_idx] + (edge.distance_meters / speed);
                pq.push({cand_dist, v});
            }
        }
    }

    return {unreachable_penalty_, unreachable_penalty_, false};
}

double CostEvaluator::compute_cost(const Route& route, const DirectedGraph& graph) const {
    if (route.stops.size() < 2) {
        return 0.0;
    }

    double total_cost = 0.0;
    for (std::size_t i = 0; i < route.stops.size() - 1; ++i) {
        const auto leg = find_leg_metrics(route.stops[i], route.stops[i + 1], graph);
        if (!leg.reachable) {
            total_cost += unreachable_penalty_;
        } else {
            total_cost += leg.distance_meters;
        }
    }
    return total_cost;
}

void CostEvaluator::update_route_metrics(Route& route, const DirectedGraph& graph) const {
    if (route.stops.size() < 2) {
        route.total_distance_meters = 0.0;
        route.total_duration_seconds = 0.0;
        if (route.stops.size() == 1) {
            const auto stop_id = route.stops[0];
            if (static_cast<std::size_t>(stop_id) < graph.node_count()) {
                route.total_duration_seconds = graph.node(stop_id).service_time_seconds;
            }
        }
        return;
    }

    double total_dist = 0.0;
    double total_dur = 0.0;

    for (std::size_t i = 0; i < route.stops.size() - 1; ++i) {
        const auto leg = find_leg_metrics(route.stops[i], route.stops[i + 1], graph);
        total_dist += leg.distance_meters;
        total_dur += leg.duration_seconds;
    }

    for (const auto stop_id : route.stops) {
        if (static_cast<std::size_t>(stop_id) < graph.node_count()) {
            total_dur += graph.node(stop_id).service_time_seconds;
        }
    }

    route.total_distance_meters = total_dist;
    route.total_duration_seconds = total_dur;
}

} // namespace routing
