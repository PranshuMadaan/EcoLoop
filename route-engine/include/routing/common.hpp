#pragma once

#include <cstdint>

namespace routing {

// Strongly typed ID definitions
using NodeId = std::uint32_t;
using VehicleId = std::uint32_t;

// Sentinel values for invalid IDs
inline constexpr NodeId kInvalidNodeId = 0xFFFF'FFFFU;
inline constexpr VehicleId kInvalidVehicleId = 0xFFFF'FFFFU;

// Waste stream segregation categories
enum class WasteStream : std::uint8_t {
    Organic = 0,
    DryRecyclable = 1,
    HazardousEwaste = 2,
    DryNonRecyclable = 3
};

namespace constants {

// Velocity limits (meters per second)
inline constexpr double kDefaultVelocityMps = 11.11;       // ~40 km/h urban default
inline constexpr double kDefaultFreeFlowSpeedMps = 13.89;   // ~50 km/h arterial default
inline constexpr double kMinAllowedSpeedMps = 1.0;          // ~3.6 km/h minimum movement speed
inline constexpr double kMaxAllowedSpeedMps = 33.33;        // ~120 km/h highway cap

// Vehicle capacity limits (kilograms)
inline constexpr double kDefaultVehicleCapacityKg = 5000.0; // 5 metric tons default
inline constexpr double kMinVehicleCapacityKg = 200.0;
inline constexpr double kMaxVehicleCapacityKg = 30000.0;    // 30 metric tons cap

} // namespace constants

} // namespace routing
