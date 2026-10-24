#pragma once

#include <routing/common.hpp>
#include <routing/node.hpp>

namespace routing {

// Vehicle representation with segregated capacity limits and shift constraints
struct WasteVehicle {
    VehicleId id{0};
    WastePayload capacity_limits{};
    double max_shift_duration_seconds{28800.0}; // Default 8 hours (8 * 3600 seconds)

    // Returns true if NO individual waste stream exceeds its limit in capacity_limits
    [[nodiscard]] constexpr bool can_carry(const WastePayload& payload) const noexcept {
        return payload.organic_kg <= capacity_limits.organic_kg &&
               payload.dry_recyclable_kg <= capacity_limits.dry_recyclable_kg &&
               payload.dry_non_recyclable_kg <= capacity_limits.dry_non_recyclable_kg &&
               payload.hazardous_ewaste_kg <= capacity_limits.hazardous_ewaste_kg;
    }
};

} // namespace routing
