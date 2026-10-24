#include <routing/fleet_optimizer.hpp>

#include <cstddef>
#include <utility>

namespace routing {

namespace {

// Helper to match a Route with its corresponding vehicle configuration
WasteVehicle find_vehicle_for_route(std::size_t route_idx,
                                   const Route& route,
                                   const std::vector<WasteVehicle>& fleet) {
    for (const auto& v : fleet) {
        if (v.id == route.vehicle_id) {
            return v;
        }
    }
    if (route_idx < fleet.size()) {
        return fleet[route_idx];
    }
    // Permissive fallback vehicle if not explicitly configured
    return WasteVehicle{
        .id = route.vehicle_id,
        .capacity_limits = WastePayload{1e9, 1e9, 1e9, 1e9},
        .max_shift_duration_seconds = 86400.0
    };
}

} // namespace

FleetSolution FleetOptimizer::optimize(FleetSolution initial_solution,
                                       const std::vector<WasteVehicle>& fleet) const {
    FleetSolution solution = std::move(initial_solution);

    // Initial 2-Opt pass on individual routes
    for (auto& r : solution.routes) {
        r = single_route_optimizer_.optimize_route(r, graph_);
    }

    const std::size_t num_routes = solution.routes.size();
    if (num_routes < 2) {
        for (auto& r : solution.routes) {
            evaluator_.update_route_metrics(r, graph_);
        }
        return solution;
    }

    std::size_t iteration = 0;
    bool global_improved = true;

    while (global_improved && iteration < max_iterations_) {
        global_improved = false;
        ++iteration;

        bool move_applied = false;

        // Loop over pairs of distinct routes (R1, R2)
        for (std::size_t r1_idx = 0; r1_idx < num_routes && !move_applied; ++r1_idx) {
            for (std::size_t r2_idx = 0; r2_idx < num_routes && !move_applied; ++r2_idx) {
                if (r1_idx == r2_idx) {
                    continue;
                }

                const auto& R1 = solution.routes[r1_idx];
                const auto& R2 = solution.routes[r2_idx];
                const auto veh_1 = find_vehicle_for_route(r1_idx, R1, fleet);
                const auto veh_2 = find_vehicle_for_route(r2_idx, R2, fleet);

                const double cost_R1_orig = evaluator_.compute_cost(R1, graph_);
                const double cost_R2_orig = evaluator_.compute_cost(R2, graph_);

                // Operator 1: Relocate intermediate stop i from R1 into R2 at position j
                if (R1.stops.size() >= 3 && R2.stops.size() >= 2) {
                    for (std::size_t i = 1; i <= R1.stops.size() - 2 && !move_applied; ++i) {
                        for (std::size_t j = 1; j <= R2.stops.size() - 1 && !move_applied; ++j) {
                            Route cand_R1 = R1;
                            const NodeId moved_node = cand_R1.stops[i];
                            cand_R1.stops.erase(cand_R1.stops.begin() + static_cast<std::ptrdiff_t>(i));

                            Route cand_R2 = R2;
                            cand_R2.stops.insert(cand_R2.stops.begin() + static_cast<std::ptrdiff_t>(j), moved_node);

                            const double cost_R1_new = evaluator_.compute_cost(cand_R1, graph_);
                            const double cost_R2_new = evaluator_.compute_cost(cand_R2, graph_);
                            const double delta_cost = (cost_R1_new - cost_R1_orig) + (cost_R2_new - cost_R2_orig);

                            if (delta_cost < -epsilon_) {
                                if (is_route_feasible(cand_R1, veh_1, graph_, evaluator_) &&
                                    is_route_feasible(cand_R2, veh_2, graph_, evaluator_)) {
                                    cand_R1 = single_route_optimizer_.optimize_route(cand_R1, graph_);
                                    cand_R2 = single_route_optimizer_.optimize_route(cand_R2, graph_);
                                    solution.routes[r1_idx] = std::move(cand_R1);
                                    solution.routes[r2_idx] = std::move(cand_R2);
                                    move_applied = true;
                                    global_improved = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (move_applied) {
                    break;
                }

                // Operator 2: Swap intermediate stop i from R1 with intermediate stop j in R2
                if (R1.stops.size() >= 3 && R2.stops.size() >= 3) {
                    for (std::size_t i = 1; i <= R1.stops.size() - 2 && !move_applied; ++i) {
                        for (std::size_t j = 1; j <= R2.stops.size() - 2 && !move_applied; ++j) {
                            Route cand_R1 = R1;
                            Route cand_R2 = R2;
                            std::swap(cand_R1.stops[i], cand_R2.stops[j]);

                            const double cost_R1_new = evaluator_.compute_cost(cand_R1, graph_);
                            const double cost_R2_new = evaluator_.compute_cost(cand_R2, graph_);
                            const double delta_cost = (cost_R1_new - cost_R1_orig) + (cost_R2_new - cost_R2_orig);

                            if (delta_cost < -epsilon_) {
                                if (is_route_feasible(cand_R1, veh_1, graph_, evaluator_) &&
                                    is_route_feasible(cand_R2, veh_2, graph_, evaluator_)) {
                                    cand_R1 = single_route_optimizer_.optimize_route(cand_R1, graph_);
                                    cand_R2 = single_route_optimizer_.optimize_route(cand_R2, graph_);
                                    solution.routes[r1_idx] = std::move(cand_R1);
                                    solution.routes[r2_idx] = std::move(cand_R2);
                                    move_applied = true;
                                    global_improved = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Final route metric updates
    for (auto& r : solution.routes) {
        evaluator_.update_route_metrics(r, graph_);
    }

    return solution;
}

} // namespace routing
