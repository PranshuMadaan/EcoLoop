#pragma once

#include <routing/common.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>
#include <routing/solution.hpp>
#include <routing/vehicle.hpp>

#include <cstdint>
#include <optional>
#include <vector>

namespace routing {

// High-level facade orchestrating graph construction, initial solution generation,
// and multi-vehicle fleet optimization.
class WasteRoutingEngine {
public:
    WasteRoutingEngine() = default;

    // Ingestion APIs
    void add_node(WasteNode node);
    void add_edge(NodeId from,
                  NodeId to,
                  double distance_m,
                  double speed_mps,
                  std::uint8_t turn_flags = 0);
    void add_vehicle(WasteVehicle vehicle);
    void set_starting_depot(NodeId depot_id);

    // Full pipeline execution
    [[nodiscard]] FleetSolution solve(const std::vector<NodeId>& unassigned_stops);

    // Inspectors
    [[nodiscard]] const std::vector<WasteVehicle>& fleet() const noexcept { return fleet_; }
    [[nodiscard]] NodeId starting_depot() const noexcept { return starting_depot_; }
    [[nodiscard]] bool is_graph_sealed() const noexcept { return graph_sealed_; }
    [[nodiscard]] const std::optional<DirectedGraph>& graph() const noexcept { return sealed_graph_; }

private:
    GraphBuilder graph_builder_{};
    std::vector<WasteVehicle> fleet_{};
    NodeId starting_depot_{0};
    bool graph_sealed_{false};
    std::optional<DirectedGraph> sealed_graph_{};
};

} // namespace routing
