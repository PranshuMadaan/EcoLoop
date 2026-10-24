#include <routing/optimizer.hpp>

#include <algorithm>
#include <cstddef>

namespace routing {

Route RouteOptimizer::optimize_route(const Route& input_route, const DirectedGraph& graph) const {
    Route current_route = input_route;

    // Routes with <= 3 stops cannot perform intermediate 2-Opt swaps
    if (current_route.stops.size() <= 3) {
        evaluator_.update_route_metrics(current_route, graph);
        return current_route;
    }

    double current_cost = evaluator_.compute_cost(current_route, graph);
    const std::size_t n = current_route.stops.size();

    std::size_t iteration = 0;
    bool improved = true;

    while (improved && iteration < max_iterations_) {
        improved = false;
        ++iteration;

        // Loop over intermediate indices: 1 <= i < j <= n - 2
        for (std::size_t i = 1; i <= n - 3; ++i) {
            for (std::size_t j = i + 1; j <= n - 2; ++j) {
                Route candidate = current_route;
                std::reverse(candidate.stops.begin() + static_cast<std::ptrdiff_t>(i),
                             candidate.stops.begin() + static_cast<std::ptrdiff_t>(j + 1));

                const double candidate_cost = evaluator_.compute_cost(candidate, graph);
                const double delta_cost = candidate_cost - current_cost;

                if (delta_cost < -epsilon_) {
                    current_route = std::move(candidate);
                    current_cost = candidate_cost;
                    improved = true;
                    break;
                }
            }
            if (improved) {
                break;
            }
        }
    }

    evaluator_.update_route_metrics(current_route, graph);
    return current_route;
}

Route RouteOptimizer::add_and_optimize(const std::vector<NodeId>& raw_stops,
                                       const DirectedGraph& graph,
                                       VehicleId vid) const {
    Route route(vid, raw_stops);
    return optimize_route(route, graph);
}

} // namespace routing
