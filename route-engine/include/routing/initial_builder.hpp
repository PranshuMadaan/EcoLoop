#pragma once

#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/facility_index.hpp>
#include <routing/graph.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <vector>

namespace routing {

// Constructs a feasible initial FleetSolution using Greedy Nearest Neighbor
// with Intermediate Replenishment (CVRP-IR).
class InitialSolutionBuilder {
public:
    InitialSolutionBuilder(const DirectedGraph& graph,
                           const CostEvaluator& evaluator,
                           const FacilityIndex& facility_index) noexcept
        : graph_(graph), evaluator_(evaluator), facility_index_(facility_index) {}

    // Builds a FleetSolution greedily assigning stops to vehicles, inserting
    // intermediate disposal trips on overflow and handing off to the next
    // vehicle when the shift time budget is exhausted.
    [[nodiscard]] FleetSolution build(NodeId start_depot,
                                      std::vector<NodeId> unassigned_stops,
                                      const std::vector<WasteVehicle>& fleet) const;

    [[nodiscard]] const DirectedGraph& graph() const noexcept { return graph_; }
    [[nodiscard]] const CostEvaluator& evaluator() const noexcept { return evaluator_; }
    [[nodiscard]] const FacilityIndex& facility_index() const noexcept { return facility_index_; }

private:
    const DirectedGraph& graph_;
    const CostEvaluator& evaluator_;
    const FacilityIndex& facility_index_;

    // Returns the NodeId of the closest stop (by travel time) from current_location
    [[nodiscard]] std::size_t find_nearest_stop_index(
        NodeId current_location,
        const std::vector<NodeId>& unassigned) const;

    // Finds the terminal sink reachable from current_location (any stream Landfill/composter)
    [[nodiscard]] NodeId find_terminal_sink(NodeId from_node) const;
};

} // namespace routing
