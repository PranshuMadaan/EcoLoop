#pragma once

#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/graph.hpp>
#include <routing/route.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <cstddef>
#include <vector>

namespace routing {

// Optimizes route sequences using directed 2-Opt local search
class RouteOptimizer {
public:
    static constexpr double kDefaultEpsilon = 1e-4;
    static constexpr std::size_t kDefaultMaxIterations = 1000;

    explicit RouteOptimizer(CostEvaluator evaluator = CostEvaluator{},
                            double epsilon = kDefaultEpsilon,
                            std::size_t max_iterations = kDefaultMaxIterations) noexcept
        : evaluator_(evaluator), epsilon_(epsilon), max_iterations_(max_iterations) {}

    // Optimizes an existing Route preserving fixed start and end stops
    [[nodiscard]] Route optimize_route(const Route& input_route, const DirectedGraph& graph) const;

    // Same 2-Opt search, but every candidate must also stay feasible for the
    // given vehicle (capacity incl. disposal ordering, and shift duration).
    // Prevents reordering a disposal visit behind the load that needed it.
    [[nodiscard]] Route optimize_route(const Route& input_route,
                                       const DirectedGraph& graph,
                                       const WasteVehicle& vehicle) const;

    // Convenience ingestion interface: constructs Route from stops and optimizes
    [[nodiscard]] Route add_and_optimize(const std::vector<NodeId>& raw_stops,
                                         const DirectedGraph& graph,
                                         VehicleId vid = 0) const;

    [[nodiscard]] const CostEvaluator& evaluator() const noexcept { return evaluator_; }

private:
    CostEvaluator evaluator_;
    double epsilon_{kDefaultEpsilon};
    std::size_t max_iterations_{kDefaultMaxIterations};

    [[nodiscard]] Route optimize_route_impl(const Route& input_route,
                                            const DirectedGraph& graph,
                                            const WasteVehicle* vehicle) const;
};

} // namespace routing
