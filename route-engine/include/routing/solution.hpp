#pragma once

#include <routing/cost_evaluator.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>
#include <routing/route.hpp>
#include <routing/vehicle.hpp>

#include <vector>

namespace routing {

// Represents a multi-vehicle fleet solution
struct FleetSolution {
    std::vector<Route> routes{};

    [[nodiscard]] double total_distance_meters() const noexcept {
        double dist = 0.0;
        for (const auto& r : routes) {
            dist += r.total_distance_meters;
        }
        return dist;
    }

    [[nodiscard]] double total_duration_seconds() const noexcept {
        double dur = 0.0;
        for (const auto& r : routes) {
            dur += r.total_duration_seconds;
        }
        return dur;
    }

    [[nodiscard]] bool operator==(const FleetSolution& other) const noexcept = default;
};

// Computes accumulated payload demand across all intermediate stops of a route
[[nodiscard]] WastePayload compute_route_payload(const Route& route, const DirectedGraph& graph);

// Checks if a route satisfies both payload capacity and shift duration constraints
[[nodiscard]] bool is_route_feasible(const Route& route,
                                     const WasteVehicle& vehicle,
                                     const DirectedGraph& graph,
                                     const CostEvaluator& evaluator);

} // namespace routing
