#pragma once

#include <routing/common.hpp>
#include <routing/cost_evaluator.hpp>
#include <routing/graph.hpp>
#include <routing/node.hpp>

#include <array>
#include <cstddef>
#include <vector>

namespace routing {

// Pre-indexed lookup of disposal facility nodes by waste stream acceptance
class FacilityIndex {
public:
    static constexpr std::size_t kNumStreams = 4;

    // Scans the graph at construction time to bucket all sink nodes by stream
    explicit FacilityIndex(const DirectedGraph& graph);

    // Returns the NodeId of the nearest sink accepting the given stream,
    // evaluated by travel time from from_node. Returns kInvalidNodeId if none.
    [[nodiscard]] NodeId find_nearest_sink(const DirectedGraph& graph,
                                           const CostEvaluator& evaluator,
                                           NodeId from_node,
                                           WasteStream stream) const;

    // Returns true if at least one facility node accepts the given stream
    [[nodiscard]] bool has_sink_for(WasteStream stream) const noexcept;

    // Returns all sink node IDs for a given stream
    [[nodiscard]] const std::vector<NodeId>& sinks_for(WasteStream stream) const noexcept;

private:
    // Index 0 = Organic, 1 = DryRecyclable, 2 = HazardousEwaste, 3 = DryNonRecyclable
    std::array<std::vector<NodeId>, kNumStreams> sinks_by_stream_{};

    [[nodiscard]] static std::size_t stream_index(WasteStream stream) noexcept {
        return static_cast<std::size_t>(stream);
    }
};

} // namespace routing
