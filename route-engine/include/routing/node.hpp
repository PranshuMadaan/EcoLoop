#pragma once

#include <routing/common.hpp>

#include <cstdint>

namespace routing {

// Facility / Node classification
enum class NodeType : std::uint8_t {
    Depot = 0,
    CollectionPoint = 1,
    TransferStation = 2,
    CompostingFacility = 3,
    MaterialRecoveryFacility = 4,
    Landfill = 5
};

// Segregated waste mass quantities in kilograms
struct WastePayload {
    double organic_kg{0.0};
    double dry_recyclable_kg{0.0};
    double dry_non_recyclable_kg{0.0};
    double hazardous_ewaste_kg{0.0};

    [[nodiscard]] constexpr double total_kg() const noexcept {
        return organic_kg + dry_recyclable_kg + dry_non_recyclable_kg + hazardous_ewaste_kg;
    }

    constexpr WastePayload& operator+=(const WastePayload& other) noexcept {
        organic_kg += other.organic_kg;
        dry_recyclable_kg += other.dry_recyclable_kg;
        dry_non_recyclable_kg += other.dry_non_recyclable_kg;
        hazardous_ewaste_kg += other.hazardous_ewaste_kg;
        return *this;
    }

    [[nodiscard]] friend constexpr WastePayload operator+(WastePayload lhs, const WastePayload& rhs) noexcept {
        lhs += rhs;
        return lhs;
    }

    [[nodiscard]] bool operator==(const WastePayload& other) const noexcept = default;
};

// Spatial node representing depots, collection sites, or processing facilities
struct WasteNode {
    NodeId id{0};
    NodeType type{NodeType::CollectionPoint};
    double latitude{0.0};
    double longitude{0.0};
    WastePayload demand{};
    double service_time_seconds{0.0};

    [[nodiscard]] constexpr bool is_sink_for(WasteStream stream) const noexcept {
        switch (type) {
            case NodeType::CompostingFacility:
                return stream == WasteStream::Organic;
            case NodeType::MaterialRecoveryFacility:
                return stream == WasteStream::DryRecyclable;
            case NodeType::Landfill:
                return stream == WasteStream::DryNonRecyclable;
            case NodeType::Depot:
            case NodeType::CollectionPoint:
            case NodeType::TransferStation:
            default:
                return false;
        }
    }
};

} // namespace routing
