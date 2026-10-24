#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <routing/common.hpp>
#include <routing/engine.hpp>
#include <routing/io.hpp>

#include <nlohmann/json.hpp>

#include <string>
#include <vector>

using Catch::Matchers::WithinRel;

TEST_CASE("WasteRouteIO: End-to-end municipal JSON ingestion and solution export", "[io][e2e]") {
    // 1. Raw JSON string literal matching municipal scenario schema
    const std::string scenario_json = R"({
      "depot_id": 0,
      "vehicles": [
        {
          "id": 1,
          "capacity_organic": 5000.0,
          "capacity_dry": 2000.0,
          "capacity_hw": 500.0,
          "shift_seconds": 28800.0
        }
      ],
      "nodes": [
        {
          "id": 0,
          "type": 0,
          "lat": 28.6139,
          "lon": 77.2090,
          "organic": 0.0,
          "dry": 0.0,
          "hw": 0.0,
          "service_time": 0.0
        },
        {
          "id": 1,
          "type": 1,
          "lat": 28.6150,
          "lon": 77.2100,
          "organic": 120.0,
          "dry": 40.0,
          "hw": 5.0,
          "service_time": 60.0
        },
        {
          "id": 2,
          "type": 1,
          "lat": 28.6180,
          "lon": 77.2130,
          "organic": 80.0,
          "dry": 60.0,
          "hw": 10.0,
          "service_time": 60.0
        },
        {
          "id": 3,
          "type": 3,
          "lat": 28.6250,
          "lon": 77.2200,
          "organic": 0.0,
          "dry": 0.0,
          "hw": 0.0,
          "service_time": 120.0
        }
      ],
      "edges": [
        {"from": 0, "to": 1, "distance_m": 200.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 1, "to": 0, "distance_m": 200.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 1, "to": 2, "distance_m": 250.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 2, "to": 1, "distance_m": 250.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 2, "to": 3, "distance_m": 300.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 3, "to": 2, "distance_m": 300.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 0, "to": 2, "distance_m": 400.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 2, "to": 0, "distance_m": 400.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 1, "to": 3, "distance_m": 500.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 3, "to": 1, "distance_m": 500.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 0, "to": 3, "distance_m": 600.0, "speed_mps": 10.0, "turn_penalty": 0},
        {"from": 3, "to": 0, "distance_m": 600.0, "speed_mps": 10.0, "turn_penalty": 0}
      ],
      "unassigned_stops": [1, 2]
    })";

    // 2. Parse scenario into fresh engine
    routing::WasteRoutingEngine engine;
    std::vector<routing::NodeId> unassigned_stops;
    routing::WasteRouteIO::load_scenario(scenario_json, engine, unassigned_stops);

    REQUIRE(engine.starting_depot() == 0);
    REQUIRE(engine.fleet().size() == 1);
    REQUIRE(unassigned_stops.size() == 2);
    REQUIRE(unassigned_stops[0] == 1);
    REQUIRE(unassigned_stops[1] == 2);

    // 3. Execute optimization pipeline
    const routing::FleetSolution solution = engine.solve(unassigned_stops);
    REQUIRE_FALSE(solution.routes.empty());

    // 4. Export solution to JSON string
    const std::string exported_json_str = routing::WasteRouteIO::export_solution(solution);
    REQUIRE_FALSE(exported_json_str.empty());

    // 5. Parse output JSON and assert schema adherence
    const auto output_json = nlohmann::json::parse(exported_json_str);

    REQUIRE(output_json.is_object());
    REQUIRE(output_json.contains("routes"));
    REQUIRE(output_json["routes"].is_array());
    REQUIRE(output_json["routes"].size() > 0);
    REQUIRE(output_json.contains("total_fleet_distance_m"));
    REQUIRE(output_json.contains("total_fleet_duration_s"));

    // Verify fields of individual route
    const auto& first_route = output_json["routes"][0];
    REQUIRE(first_route.contains("vehicle_id"));
    REQUIRE(first_route["vehicle_id"] == 1);
    REQUIRE(first_route.contains("distance_m"));
    REQUIRE(first_route["distance_m"].get<double>() > 0.0);
    REQUIRE(first_route.contains("duration_s"));
    REQUIRE(first_route["duration_s"].get<double>() > 0.0);
    REQUIRE(first_route.contains("stops"));
    REQUIRE(first_route["stops"].is_array());
    REQUIRE(first_route["stops"].size() >= 3);

    // Route starts and ends at depot (0), visiting the dump (3) before returning
    CHECK(first_route["stops"].front() == 0);
    CHECK(first_route["stops"].back() == 0);

    // Unserved stops are reported in the export schema
    REQUIRE(output_json.contains("unserved_stops"));
    REQUIRE(output_json["unserved_stops"].is_array());
    CHECK(output_json["unserved_stops"].empty());

    // Aggregate metrics match route metrics for single-vehicle solution
    REQUIRE_THAT(output_json["total_fleet_distance_m"].get<double>(),
                 WithinRel(first_route["distance_m"].get<double>(), 1e-6));
    REQUIRE_THAT(output_json["total_fleet_duration_s"].get<double>(),
                 WithinRel(first_route["duration_s"].get<double>(), 1e-6));
}

TEST_CASE("WasteRouteIO: Export empty solution produces valid schema", "[io][empty]") {
    const routing::FleetSolution empty_solution{};
    const std::string exported = routing::WasteRouteIO::export_solution(empty_solution);

    const auto parsed = nlohmann::json::parse(exported);
    REQUIRE(parsed.is_object());
    REQUIRE(parsed.contains("routes"));
    REQUIRE(parsed["routes"].is_array());
    CHECK(parsed["routes"].empty());
    REQUIRE(parsed.contains("total_fleet_distance_m"));
    CHECK(parsed["total_fleet_distance_m"] == 0.0);
    REQUIRE(parsed.contains("total_fleet_duration_s"));
    CHECK(parsed["total_fleet_duration_s"] == 0.0);
}

TEST_CASE("WasteRouteIO: Malformed JSON triggers parse error", "[io][error]") {
    routing::WasteRoutingEngine engine;
    std::vector<routing::NodeId> stops;

    const std::string malformed_json = "{ invalid_json: true, ";
    CHECK_THROWS_AS(routing::WasteRouteIO::load_scenario(malformed_json, engine, stops),
                    nlohmann::json::parse_error);
}
