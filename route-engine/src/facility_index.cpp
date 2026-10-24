#include <routing/facility_index.hpp>

#include <limits>

namespace routing {

FacilityIndex::FacilityIndex(const DirectedGraph& graph) {
    for (const auto& node : graph.nodes()) {
        const std::array<WasteStream, kNumStreams> streams = {
            WasteStream::Organic,
            WasteStream::DryRecyclable,
            WasteStream::HazardousEwaste,
            WasteStream::DryNonRecyclable
        };
        for (const auto stream : streams) {
            if (node.is_sink_for(stream)) {
                sinks_by_stream_[stream_index(stream)].push_back(node.id);
            }
        }
    }
}

NodeId FacilityIndex::find_nearest_sink(const DirectedGraph& graph,
                                         const CostEvaluator& evaluator,
                                         NodeId from_node,
                                         WasteStream stream) const {
    const auto& candidates = sinks_by_stream_[stream_index(stream)];
    if (candidates.empty()) {
        return kInvalidNodeId;
    }

    NodeId best = kInvalidNodeId;
    double best_time = std::numeric_limits<double>::infinity();

    for (const NodeId sink_id : candidates) {
        if (sink_id == from_node) {
            return sink_id; // Already there
        }
        const auto leg = evaluator.find_leg_metrics(from_node, sink_id, graph);
        if (leg.reachable && leg.duration_seconds < best_time) {
            best_time = leg.duration_seconds;
            best = sink_id;
        }
    }
    return best;
}

bool FacilityIndex::has_sink_for(WasteStream stream) const noexcept {
    return !sinks_by_stream_[stream_index(stream)].empty();
}

const std::vector<NodeId>& FacilityIndex::sinks_for(WasteStream stream) const noexcept {
    return sinks_by_stream_[stream_index(stream)];
}

} // namespace routing
