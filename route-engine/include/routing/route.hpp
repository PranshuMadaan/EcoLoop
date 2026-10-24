#pragma once

#include <routing/common.hpp>

#include <cstddef>
#include <span>
#include <vector>

namespace routing {

// Represents a planned or optimized vehicle route stopping at a sequence of nodes
class Route {
public:
    VehicleId vehicle_id{0};
    std::vector<NodeId> stops{};
    double total_distance_meters{0.0};
    double total_duration_seconds{0.0};

    Route() = default;
    explicit Route(VehicleId vid) : vehicle_id(vid) {}
    Route(VehicleId vid, std::vector<NodeId> stop_sequence)
        : vehicle_id(vid), stops(std::move(stop_sequence)) {}

    void add_stop(NodeId node_id);

    [[nodiscard]] std::size_t size() const noexcept { return stops.size(); }
    [[nodiscard]] bool empty() const noexcept { return stops.empty(); }

    [[nodiscard]] NodeId start_node() const;
    [[nodiscard]] NodeId end_node() const;

    // Subspan of stops between index 1 and size - 2 (reorderable intermediate stops)
    [[nodiscard]] std::span<const NodeId> intermediate_stops() const;

    void clear();

    [[nodiscard]] bool operator==(const Route& other) const noexcept = default;
};

} // namespace routing
