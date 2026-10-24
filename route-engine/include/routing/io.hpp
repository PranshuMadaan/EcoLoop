#pragma once

#include <routing/common.hpp>
#include <routing/engine.hpp>
#include <routing/solution.hpp>

#include <string>
#include <vector>

namespace routing {

// Handles deserialization of municipal scenario JSON payloads into the routing engine
// and serialization of optimized FleetSolution results into JSON for external consumption.
class WasteRouteIO {
public:
    // Ingests incoming municipal scenario JSON and populates the engine and unassigned stops list.
    static void load_scenario(const std::string& json_string,
                              WasteRoutingEngine& engine,
                              std::vector<NodeId>& unassigned_stops);

    // Serializes a FleetSolution into a JSON formatted string.
    [[nodiscard]] static std::string export_solution(const FleetSolution& solution);
};

} // namespace routing
