#include <routing/initial_builder.hpp>

#include <routing/active_vehicle.hpp>

#include <algorithm>
#include <array>
#include <limits>
#include <utility>

namespace routing {

namespace {

// Stream list in overflow priority order (most constrained first)
constexpr std::array<WasteStream, 4> kAllStreams = {
    WasteStream::Organic,
    WasteStream::DryRecyclable,
    WasteStream::HazardousEwaste,
    WasteStream::DryNonRecyclable
};

// Returns the mass (kg) held in the given stream of a payload or capacity limit
double stream_kg(const WastePayload& payload, WasteStream stream) noexcept {
    switch (stream) {
        case WasteStream::Organic:
            return payload.organic_kg;
        case WasteStream::DryRecyclable:
            return payload.dry_recyclable_kg;
        case WasteStream::HazardousEwaste:
            return payload.hazardous_ewaste_kg;
        case WasteStream::DryNonRecyclable:
            return payload.dry_non_recyclable_kg;
    }
    return 0.0;
}

// Returns true if adding demand to current_load would overflow the vehicle capacity
bool stream_would_overflow(const WastePayload& current_load,
                            const WastePayload& demand,
                            const WastePayload& limits,
                            WasteStream stream) noexcept {
    return stream_kg(current_load, stream) + stream_kg(demand, stream) > stream_kg(limits, stream);
}

} // namespace

std::size_t InitialSolutionBuilder::find_nearest_stop_index(
    NodeId current_location,
    const std::vector<NodeId>& unassigned) const {
    std::size_t best_idx = 0;
    double best_time = std::numeric_limits<double>::infinity();

    for (std::size_t i = 0; i < unassigned.size(); ++i) {
        const auto leg = evaluator_.find_leg_metrics(current_location, unassigned[i], graph_);
        if (leg.reachable && leg.duration_seconds < best_time) {
            best_time = leg.duration_seconds;
            best_idx = i;
        }
    }
    return best_idx;
}

NodeId InitialSolutionBuilder::find_terminal_sink(NodeId from_node) const {
    NodeId best_sink = kInvalidNodeId;
    double best_time = std::numeric_limits<double>::infinity();

    for (const auto stream : kAllStreams) {
        const NodeId sink_id = facility_index_.find_nearest_sink(graph_, evaluator_, from_node, stream);
        if (sink_id != kInvalidNodeId) {
            const auto leg = evaluator_.find_leg_metrics(from_node, sink_id, graph_);
            if (leg.reachable && leg.duration_seconds < best_time) {
                best_time = leg.duration_seconds;
                best_sink = sink_id;
            }
        }
    }
    return best_sink;
}

FleetSolution InitialSolutionBuilder::build(NodeId start_depot,
                                            std::vector<NodeId> unassigned_stops,
                                            const std::vector<WasteVehicle>& fleet) const {
    FleetSolution solution;
    if (fleet.empty() || unassigned_stops.empty()) {
        return solution;
    }

    std::size_t vehicle_idx = 0;
    ActiveVehicle active(fleet[vehicle_idx], start_depot);

    // Empties the active vehicle at the nearest disposal facility (if any), returns
    // it to the depot, and records the finished route. Routes that never left the
    // depot are dropped instead of published.
    const auto finalize_active = [&]() {
        const NodeId terminal = find_terminal_sink(active.current_location);
        if (terminal != kInvalidNodeId &&
            (active.current_route.stops.empty() ||
             active.current_route.stops.back() != terminal)) {
            active.current_route.add_stop(terminal);
        }
        if (active.current_route.stops.empty() ||
            active.current_route.stops.back() != start_depot) {
            active.current_route.add_stop(start_depot);
        }
        evaluator_.update_route_metrics(active.current_route, graph_);
        if (active.current_route.size() > 1) {
            solution.routes.push_back(std::move(active.current_route));
        }
    };

    while (!unassigned_stops.empty() && vehicle_idx < fleet.size()) {
        const double max_shift = active.vehicle->max_shift_duration_seconds;

        // Find nearest unassigned stop from current location
        const std::size_t nearest_idx = find_nearest_stop_index(active.current_location, unassigned_stops);
        const NodeId next_stop = unassigned_stops[nearest_idx];

        const auto leg_to_next = evaluator_.find_leg_metrics(active.current_location, next_stop, graph_);
        if (!leg_to_next.reachable) {
            // Unreachable stop: skip it (leave unassigned)
            unassigned_stops.erase(unassigned_stops.begin() + static_cast<std::ptrdiff_t>(nearest_idx));
            continue;
        }

        const double service_time =
            (static_cast<std::size_t>(next_stop) < graph_.node_count())
                ? graph_.node(next_stop).service_time_seconds
                : 0.0;

        const WastePayload& next_demand =
            (static_cast<std::size_t>(next_stop) < graph_.node_count())
                ? graph_.node(next_stop).demand
                : WastePayload{};

        // --- Capacity Check ---
        if (active.would_overflow(next_demand)) {
            // A stream whose demand alone exceeds the compartment capacity can
            // never fit on any empty truck — no disposal trip can fix that.
            bool unserviceable = false;
            if (active.vehicle != nullptr) {
                for (const auto stream : kAllStreams) {
                    if (stream_would_overflow(active.current_load, next_demand,
                                              active.vehicle->capacity_limits, stream) &&
                        stream_kg(next_demand, stream) > stream_kg(active.vehicle->capacity_limits, stream)) {
                        unserviceable = true;
                        break;
                    }
                }
            }

            // Handle each overflowing stream: route to nearest disposal facility
            bool disposal_performed = false;
            if (!unserviceable) {
                for (const auto stream : kAllStreams) {
                    if (active.vehicle != nullptr &&
                        stream_would_overflow(active.current_load, next_demand,
                                              active.vehicle->capacity_limits, stream)) {
                        const NodeId sink = facility_index_.find_nearest_sink(
                            graph_, evaluator_, active.current_location, stream);
                        if (sink == kInvalidNodeId) {
                            continue; // No sink available for this stream – skip disposal
                        }
                        const auto leg_to_sink = evaluator_.find_leg_metrics(
                            active.current_location, sink, graph_);
                        if (!leg_to_sink.reachable) {
                            continue;
                        }
                        const double sink_service =
                            (static_cast<std::size_t>(sink) < graph_.node_count())
                                ? graph_.node(sink).service_time_seconds
                                : 0.0;

                        active.current_route.add_stop(sink);
                        active.current_time_seconds += leg_to_sink.duration_seconds + sink_service;
                        active.current_location = sink;
                        active.reset_load(stream);
                        disposal_performed = true;
                    }
                }
            }
            if (disposal_performed) {
                // After disposal(s), try the stop again (re-evaluate leg from new location)
                continue;
            }

            // Capacity is full and no disposal facility can free it: hand the stop
            // to the next vehicle, or report it unserved when the fleet is exhausted.
            if (vehicle_idx + 1 < fleet.size()) {
                finalize_active();
                ++vehicle_idx;
                active = ActiveVehicle(fleet[vehicle_idx], start_depot);
            } else {
                solution.unserved_stops.push_back(next_stop);
                unassigned_stops.erase(unassigned_stops.begin() + static_cast<std::ptrdiff_t>(nearest_idx));
            }
            continue;
        }

        // --- Shift Time Check ---
        // Estimate time to serve next_stop then reach a terminal sink from there
        const NodeId terminal_from_next = find_terminal_sink(next_stop);
        double return_time = 0.0;
        if (terminal_from_next != kInvalidNodeId) {
            const auto return_leg = evaluator_.find_leg_metrics(next_stop, terminal_from_next, graph_);
            if (return_leg.reachable) {
                return_time = return_leg.duration_seconds;
            }
        }

        const double projected_time =
            active.current_time_seconds + leg_to_next.duration_seconds + service_time + return_time;

        if (projected_time > max_shift && active.current_time_seconds > 0.0) {
            // This vehicle is at capacity for shift time — finalize it
            finalize_active();

            // Advance to next vehicle
            ++vehicle_idx;
            if (vehicle_idx >= fleet.size()) {
                break;
            }
            active = ActiveVehicle(fleet[vehicle_idx], start_depot);
            continue;
        }

        // --- Accept the stop ---
        active.current_route.add_stop(next_stop);
        active.current_load += next_demand;
        active.current_time_seconds += leg_to_next.duration_seconds + service_time;
        active.current_location = next_stop;
        unassigned_stops.erase(unassigned_stops.begin() + static_cast<std::ptrdiff_t>(nearest_idx));
    }

    // Finalize the last active vehicle's route
    if (!active.current_route.empty()) {
        finalize_active();
    }

    return solution;
}

} // namespace routing
