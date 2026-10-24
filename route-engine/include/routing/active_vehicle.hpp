#pragma once

#include <routing/common.hpp>
#include <routing/node.hpp>
#include <routing/route.hpp>
#include <routing/vehicle.hpp>

namespace routing {

// Lightweight runtime state for a single vehicle during route construction
struct ActiveVehicle {
    const WasteVehicle* vehicle{nullptr}; // non-owning pointer to static vehicle config
    Route current_route{};
    WastePayload current_load{};
    double current_time_seconds{0.0};
    NodeId current_location{kInvalidNodeId};

    ActiveVehicle() = default;
    ActiveVehicle(const WasteVehicle& veh, NodeId start_node)
        : vehicle(&veh),
          current_route(veh.id),
          current_time_seconds(0.0),
          current_location(start_node) {
        current_route.add_stop(start_node);
    }

    // Resets a single waste stream compartment to zero after disposal at a facility
    void reset_load(WasteStream stream) noexcept {
        switch (stream) {
            case WasteStream::Organic:
                current_load.organic_kg = 0.0;
                return;
            case WasteStream::DryRecyclable:
                current_load.dry_recyclable_kg = 0.0;
                return;
            case WasteStream::HazardousEwaste:
                current_load.hazardous_ewaste_kg = 0.0;
                return;
            case WasteStream::DryNonRecyclable:
                current_load.dry_non_recyclable_kg = 0.0;
                return;
        }
    }

    // Returns true if there is still shift time budget remaining
    [[nodiscard]] bool has_time_remaining(double max_shift) const noexcept {
        return current_time_seconds < max_shift;
    }

    // Returns the first stream that would overflow on adding the given demand, or -1 if none
    [[nodiscard]] bool would_overflow(const WastePayload& demand) const noexcept {
        if (vehicle == nullptr) {
            return false;
        }
        const auto& lim = vehicle->capacity_limits;
        return (current_load.organic_kg + demand.organic_kg > lim.organic_kg) ||
               (current_load.dry_recyclable_kg + demand.dry_recyclable_kg > lim.dry_recyclable_kg) ||
               (current_load.dry_non_recyclable_kg + demand.dry_non_recyclable_kg > lim.dry_non_recyclable_kg) ||
               (current_load.hazardous_ewaste_kg + demand.hazardous_ewaste_kg > lim.hazardous_ewaste_kg);
    }
};

} // namespace routing
