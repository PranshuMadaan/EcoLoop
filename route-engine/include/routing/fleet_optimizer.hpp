#pragma once

#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/graph.hpp>
#include <routing/optimizer.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <cstddef>
#include <vector>

namespace routing {

// Multi-vehicle inter-route optimizer using First-Improvement Descent
class FleetOptimizer {
public:
    static constexpr double kDefaultEpsilon = 1e-4;
    static constexpr std::size_t kDefaultMaxIterations = 500;

    FleetOptimizer(const DirectedGraph& graph,
                   const CostEvaluator& evaluator,
                   RouteOptimizer single_route_optimizer = RouteOptimizer{},
                   double epsilon = kDefaultEpsilon,
                   std::size_t max_iterations = kDefaultMaxIterations) noexcept
        : graph_(graph),
          evaluator_(evaluator),
          single_route_optimizer_(single_route_optimizer),
          epsilon_(epsilon),
          max_iterations_(max_iterations) {}

    // Optimizes fleet solution via Relocate and Swap operators under capacity & shift limits
    [[nodiscard]] FleetSolution optimize(FleetSolution initial_solution,
                                         const std::vector<WasteVehicle>& fleet) const;

    [[nodiscard]] const DirectedGraph& graph() const noexcept { return graph_; }
    [[nodiscard]] const CostEvaluator& evaluator() const noexcept { return evaluator_; }

private:
    const DirectedGraph& graph_;
    const CostEvaluator& evaluator_;
    RouteOptimizer single_route_optimizer_;
    double epsilon_{kDefaultEpsilon};
    std::size_t max_iterations_{kDefaultMaxIterations};
};

} // namespace routing
