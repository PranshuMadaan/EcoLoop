#include <routing/route.hpp>

#include <stdexcept>

namespace routing {

void Route::add_stop(NodeId node_id) {
    stops.push_back(node_id);
}

NodeId Route::start_node() const {
    if (stops.empty()) {
        throw std::out_of_range("Cannot query start_node on an empty Route.");
    }
    return stops.front();
}

NodeId Route::end_node() const {
    if (stops.empty()) {
        throw std::out_of_range("Cannot query end_node on an empty Route.");
    }
    return stops.back();
}

std::span<const NodeId> Route::intermediate_stops() const {
    if (stops.size() < 3) {
        return {};
    }
    return {stops.data() + 1, stops.size() - 2};
}

void Route::clear() {
    stops.clear();
    total_distance_meters = 0.0;
    total_duration_seconds = 0.0;
}

} // namespace routing
