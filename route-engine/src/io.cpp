#include <routing/io.hpp>

#include <nlohmann/json.hpp>

#include <cstdint>
#include <string>
#include <utility>
#include <vector>

namespace routing {

void WasteRouteIO::load_scenario(const std::string& json_string,
                                 WasteRoutingEngine& engine,
                                 std::vector<NodeId>& unassigned_stops) {
    const auto root = nlohmann::json::parse(json_string);

    // 1. Starting depot
    if (root.contains("depot_id")) {
        engine.set_starting_depot(root["depot_id"].get<NodeId>());
    }

    // 2. Vehicles
    if (root.contains("vehicles")) {
        for (const auto& v : root["vehicles"]) {
            WasteVehicle veh;
            veh.id = v["id"].get<VehicleId>();

            const double cap_organic = v.value("capacity_organic", 0.0);
            const double cap_dry = v.value("capacity_dry", 0.0);
            const double cap_hw = v.value("capacity_hw", 0.0);
            const double cap_dry_nr = v.value("capacity_dry_non_recyclable", cap_dry);

            veh.capacity_limits = WastePayload{
                .organic_kg = cap_organic,
                .dry_recyclable_kg = cap_dry,
                .dry_non_recyclable_kg = cap_dry_nr,
                .hazardous_ewaste_kg = cap_hw
            };

            veh.max_shift_duration_seconds = v.value("shift_seconds", 28800.0);
            engine.add_vehicle(std::move(veh));
        }
    }

    // 3. Nodes
    if (root.contains("nodes")) {
        for (const auto& n : root["nodes"]) {
            WasteNode node;
            node.id = n["id"].get<NodeId>();
            node.type = static_cast<NodeType>(n["type"].get<std::uint8_t>());
            node.latitude = n.value("lat", 0.0);
            node.longitude = n.value("lon", 0.0);

            const double org = n.value("organic", 0.0);
            const double dry = n.value("dry", 0.0);
            const double hw = n.value("hw", 0.0);
            const double dry_nr = n.value("dry_non_recyclable", 0.0);

            node.demand = WastePayload{
                .organic_kg = org,
                .dry_recyclable_kg = dry,
                .dry_non_recyclable_kg = dry_nr,
                .hazardous_ewaste_kg = hw
            };

            node.service_time_seconds = n.value("service_time", 0.0);
            engine.add_node(std::move(node));
        }
    }

    // 4. Edges
    if (root.contains("edges")) {
        for (const auto& e : root["edges"]) {
            const NodeId from = e["from"].get<NodeId>();
            const NodeId to = e["to"].get<NodeId>();
            const double dist = e["distance_m"].get<double>();
            const double speed = e.value("speed_mps", 10.0);
            const auto turn = static_cast<std::uint8_t>(e.value("turn_penalty", 0));
            engine.add_edge(from, to, dist, speed, turn);
        }
    }

    // 5. Unassigned stops
    unassigned_stops.clear();
    if (root.contains("unassigned_stops")) {
        for (const auto& s : root["unassigned_stops"]) {
            unassigned_stops.push_back(s.get<NodeId>());
        }
    }
}

std::string WasteRouteIO::export_solution(const FleetSolution& solution) {
    nlohmann::json root;
    nlohmann::json routes_json = nlohmann::json::array();

    for (const auto& route : solution.routes) {
        nlohmann::json r;
        r["vehicle_id"] = route.vehicle_id;
        r["distance_m"] = route.total_distance_meters;
        r["duration_s"] = route.total_duration_seconds;
        r["stops"] = route.stops;
        routes_json.push_back(std::move(r));
    }

    root["routes"] = std::move(routes_json);
    root["total_fleet_distance_m"] = solution.total_distance_meters();
    root["total_fleet_duration_s"] = solution.total_duration_seconds();

    return root.dump(2);
}

} // namespace routing
