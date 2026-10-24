#include <routing/engine.hpp>

#include <routing/cost_evaluator.hpp>
#include <routing/facility_index.hpp>
#include <routing/fleet_optimizer.hpp>
#include <routing/initial_builder.hpp>

#include <stdexcept>
#include <utility>

namespace routing {

void WasteRoutingEngine::add_node(WasteNode node) {
    if (graph_sealed_) {
        throw std::logic_error("Cannot add node: graph is already sealed.");
    }
    graph_builder_.add_node(std::move(node));
}

void WasteRoutingEngine::add_edge(NodeId from,
                                  NodeId to,
                                  double distance_m,
                                  double speed_mps,
                                  std::uint8_t turn_flags) {
    if (graph_sealed_) {
        throw std::logic_error("Cannot add edge: graph is already sealed.");
    }
    graph_builder_.add_edge(from, to, distance_m, speed_mps, turn_flags);
}

void WasteRoutingEngine::add_vehicle(WasteVehicle vehicle) {
    fleet_.push_back(std::move(vehicle));
}

void WasteRoutingEngine::set_starting_depot(NodeId depot_id) {
    starting_depot_ = depot_id;
}

FleetSolution WasteRoutingEngine::solve(const std::vector<NodeId>& unassigned_stops) {
    // 1. Build and seal the graph if not already sealed
    if (!graph_sealed_) {
        sealed_graph_ = graph_builder_.build();
        graph_sealed_ = true;
    }

    if (!sealed_graph_.has_value()) {
        return FleetSolution{};
    }

    const DirectedGraph& graph = *sealed_graph_;

    // 2. Instantiate CostEvaluator and FacilityIndex
    const CostEvaluator evaluator;
    const FacilityIndex facility_index(graph);

    // 3. Instantiate InitialSolutionBuilder and generate initial solution
    const InitialSolutionBuilder initial_builder(graph, evaluator, facility_index);
    FleetSolution initial_solution = initial_builder.build(starting_depot_, unassigned_stops, fleet_);

    // 4. Instantiate FleetOptimizer and run it on initial solution
    const FleetOptimizer fleet_optimizer(graph, evaluator);
    return fleet_optimizer.optimize(std::move(initial_solution), fleet_);
}

} // namespace routing
