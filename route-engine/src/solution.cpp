#include <routing/solution.hpp>

#include <algorithm>
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

WastePayload route_peak_load(const Route& route, const DirectedGraph& graph) {
    WastePayload peak{};
    WastePayload load{};
    for (const auto node_id : route.intermediate_stops()) {
        const auto idx = static_cast<std::size_t>(node_id);
        if (idx >= graph.node_count()) {
            continue;
        }
        const auto& node = graph.node(node_id);
        load += node.demand;

        // Disposal visit: compartments for every stream this facility accepts
        // are emptied before the route continues
        if (node.is_sink_for(WasteStream::Organic)) {
            load.organic_kg = 0.0;
        }
        if (node.is_sink_for(WasteStream::DryRecyclable)) {
            load.dry_recyclable_kg = 0.0;
        }
        if (node.is_sink_for(WasteStream::HazardousEwaste)) {
            load.hazardous_ewaste_kg = 0.0;
        }
        if (node.is_sink_for(WasteStream::DryNonRecyclable)) {
            load.dry_non_recyclable_kg = 0.0;
        }

        peak.organic_kg = std::max(peak.organic_kg, load.organic_kg);
        peak.dry_recyclable_kg = std::max(peak.dry_recyclable_kg, load.dry_recyclable_kg);
        peak.hazardous_ewaste_kg = std::max(peak.hazardous_ewaste_kg, load.hazardous_ewaste_kg);
        peak.dry_non_recyclable_kg = std::max(peak.dry_non_recyclable_kg, load.dry_non_recyclable_kg);
    }
    return peak;
}

bool is_route_feasible(const Route& route,
                       const WasteVehicle& vehicle,
                       const DirectedGraph& graph,
                       const CostEvaluator& evaluator) {
    // 1. Vehicle payload capacity check (disposal-aware peak load)
    if (!vehicle.can_carry(route_peak_load(route, graph))) {
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
