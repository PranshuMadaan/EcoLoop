#include <routing/common.hpp>
#include <routing/engine.hpp>
#include <routing/io.hpp>
#include <routing/solution.hpp>

#include <nlohmann/json.hpp>

#include <exception>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int main() {
    try {
        // Read entire payload from standard input
        std::ostringstream buffer;
        buffer << std::cin.rdbuf();
        const std::string input_json = buffer.str();

        if (input_json.empty()) {
            std::cerr << nlohmann::json{{"error", "Input JSON payload is empty"}}.dump(2) << '\n';
            return 1;
        }

        routing::WasteRoutingEngine engine;
        std::vector<routing::NodeId> unassigned_stops;

        // Ingest scenario payload into engine
        routing::WasteRouteIO::load_scenario(input_json, engine, unassigned_stops);

        // Execute optimization pipeline
        const routing::FleetSolution solution = engine.solve(unassigned_stops);

        // Serialize and output solution JSON to standard output
        const std::string output_json = routing::WasteRouteIO::export_solution(solution);
        std::cout << output_json << '\n';

        return 0;
    } catch (const std::exception& e) {
        const nlohmann::json err = {{"error", e.what()}};
        std::cerr << err.dump(2) << '\n';
        return 1;
    } catch (...) {
        const nlohmann::json err = {{"error", "An unknown error occurred during route optimization"}};
        std::cerr << err.dump(2) << '\n';
        return 1;
    }
}
