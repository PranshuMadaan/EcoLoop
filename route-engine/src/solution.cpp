#include <routing/solution.hpp>

#include <cstddef>

namespace routing {

WastePayload compute_route_payload(const Route& route, const DirectedGraph& graph) {
    WastePayload total{};
    for (const auto node_id : route.intermediate_stops()) {
        const auto idx = static_cast<std::size_t>(node_id);
        if (idx < graph.node_count()) {
            total += graph.node(node_id).demand;
        }
    }
    return total;
}

bool is_route_feasible(const Route& route,
                       const WasteVehicle& vehicle,
                       const DirectedGraph& graph,
                       const CostEvaluator& evaluator) {
    // 1. Vehicle payload capacity check
    const WastePayload payload = compute_route_payload(route, graph);
    if (!vehicle.can_carry(payload)) {
        return false;
    }

    // 2. Route duration and reachability check
    Route evaluated = route;
    evaluator.update_route_metrics(evaluated, graph);

    if (evaluated.total_duration_seconds > vehicle.max_shift_duration_seconds) {
        return false;
    }

    if (evaluated.total_duration_seconds >= evaluator.unreachable_penalty() ||
        evaluated.total_distance_meters >= evaluator.unreachable_penalty()) {
        return false;
    }

    return true;
}

} // namespace routing
