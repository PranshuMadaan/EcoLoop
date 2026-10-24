#include <catch2/catch_test_macros.hpp>
#include <routing/common.hpp>

#include <cstdint>
#include <type_traits>

TEST_CASE("Type traits and sizing for IDs and Enums", "[common][types]") {
    // Sizing checks
    STATIC_CHECK(sizeof(routing::WasteStream) == sizeof(std::uint8_t));
    STATIC_CHECK(sizeof(routing::NodeId) == sizeof(std::uint32_t));
    STATIC_CHECK(sizeof(routing::VehicleId) == sizeof(std::uint32_t));

    // Type trait checks
    STATIC_CHECK(std::is_same_v<routing::NodeId, std::uint32_t>);
    STATIC_CHECK(std::is_same_v<routing::VehicleId, std::uint32_t>);
    STATIC_CHECK(std::is_enum_v<routing::WasteStream>);
    STATIC_CHECK(std::is_scoped_enum_v<routing::WasteStream>);
    STATIC_CHECK(std::is_same_v<std::underlying_type_t<routing::WasteStream>, std::uint8_t>);

    // Enum representations
    STATIC_CHECK(static_cast<std::uint8_t>(routing::WasteStream::Organic) == 0);
    STATIC_CHECK(static_cast<std::uint8_t>(routing::WasteStream::DryRecyclable) == 1);
    STATIC_CHECK(static_cast<std::uint8_t>(routing::WasteStream::HazardousEwaste) == 2);
    STATIC_CHECK(static_cast<std::uint8_t>(routing::WasteStream::DryNonRecyclable) == 3);

    // Sentinel ID checks
    REQUIRE(routing::kInvalidNodeId == 0xFFFF'FFFFU);
    REQUIRE(routing::kInvalidVehicleId == 0xFFFF'FFFFU);
}

TEST_CASE("Compile-time velocity and capacity limit constants", "[common][constants]") {
    using namespace routing::constants;

    // Velocity limits sanity checks
    STATIC_CHECK(kDefaultVelocityMps > 0.0);
    STATIC_CHECK(kDefaultFreeFlowSpeedMps > 0.0);
    STATIC_CHECK(kMinAllowedSpeedMps < kMaxAllowedSpeedMps);
    STATIC_CHECK(kMinAllowedSpeedMps <= kDefaultVelocityMps);
    STATIC_CHECK(kDefaultVelocityMps <= kMaxAllowedSpeedMps);

    REQUIRE(kDefaultVelocityMps > 0.0);
    REQUIRE(kDefaultFreeFlowSpeedMps > kDefaultVelocityMps);
    REQUIRE(kMinAllowedSpeedMps == 1.0);
    REQUIRE(kMaxAllowedSpeedMps == 33.33);

    // Capacity limits sanity checks
    STATIC_CHECK(kDefaultVehicleCapacityKg > 0.0);
    STATIC_CHECK(kMinVehicleCapacityKg < kDefaultVehicleCapacityKg);
    STATIC_CHECK(kDefaultVehicleCapacityKg < kMaxVehicleCapacityKg);

    REQUIRE(kMinVehicleCapacityKg == 200.0);
    REQUIRE(kDefaultVehicleCapacityKg == 5000.0);
    REQUIRE(kMaxVehicleCapacityKg == 30000.0);
}
