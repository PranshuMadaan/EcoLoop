#include <routing/graph.hpp>

#include <algorithm>
#include <stdexcept>
#include <string>
#include <utility>

namespace routing {

DirectedGraph::DirectedGraph(std::vector<WasteNode> nodes,
                             std::vector<Edge> edges,
                             std::vector<std::size_t> head_offsets) noexcept
    : nodes_(std::move(nodes)),
      edges_(std::move(edges)),
      head_offsets_(std::move(head_offsets)) {}

const WasteNode& DirectedGraph::node(NodeId id) const {
    const auto id_idx = static_cast<std::size_t>(id);
    if (id_idx >= nodes_.size()) {
        throw std::out_of_range("NodeId " + std::to_string(id) + " is out of range for graph with " +
                                std::to_string(nodes_.size()) + " nodes.");
    }
    return nodes_[id_idx];
}

std::span<const Edge> DirectedGraph::outgoing_edges(NodeId u) const {
    const auto u_idx = static_cast<std::size_t>(u);
    if (u_idx >= nodes_.size()) {
        throw std::out_of_range("NodeId " + std::to_string(u) + " is out of range for graph with " +
                                std::to_string(nodes_.size()) + " nodes.");
    }
    const std::size_t start = head_offsets_[u_idx];
    const std::size_t end = head_offsets_[u_idx + 1];
    if (start >= end) {
        return {};
    }
    return {edges_.data() + start, end - start};
}

void GraphBuilder::add_node(WasteNode node) {
    staged_nodes_.push_back(std::move(node));
}

void GraphBuilder::add_edge(NodeId from, NodeId to, double distance_m, double speed_mps, std::uint8_t turn_flags) {
    staged_edges_.push_back(StagedEdge{
        .from = from,
        .to = to,
        .distance_meters = distance_m,
        .speed_mps = speed_mps,
        .turn_penalty_flags = turn_flags
    });
}

DirectedGraph GraphBuilder::build() {
    // Sort nodes by ID
    std::sort(staged_nodes_.begin(), staged_nodes_.end(), [](const WasteNode& a, const WasteNode& b) noexcept {
        return a.id < b.id;
    });

    const std::size_t num_nodes = staged_nodes_.size();

    // Verify contiguous zero-based indexing [0 ... num_nodes - 1]
    for (std::size_t i = 0; i < num_nodes; ++i) {
        if (staged_nodes_[i].id != static_cast<NodeId>(i)) {
            throw std::invalid_argument("Node IDs must be contiguous from 0 to N-1; mismatch at index " +
                                        std::to_string(i) + " with id " + std::to_string(staged_nodes_[i].id));
        }
    }

    // Validate edge endpoints
    for (const auto& e : staged_edges_) {
        if (static_cast<std::size_t>(e.from) >= num_nodes || static_cast<std::size_t>(e.to) >= num_nodes) {
            throw std::out_of_range("Edge endpoint out of range: from " + std::to_string(e.from) +
                                    " to " + std::to_string(e.to) + " in graph with " +
                                    std::to_string(num_nodes) + " nodes.");
        }
    }

    // Sort edges primarily by source node ID and secondarily by target node ID
    std::stable_sort(staged_edges_.begin(), staged_edges_.end(),
                     [](const StagedEdge& a, const StagedEdge& b) noexcept {
                         if (a.from != b.from) {
                             return a.from < b.from;
                         }
                         return a.to < b.to;
                     });

    // Build head_offsets_ using degree count and prefix sum
    std::vector<std::size_t> head_offsets(num_nodes + 1, 0);
    for (const auto& e : staged_edges_) {
        const auto from_idx = static_cast<std::size_t>(e.from);
        head_offsets[from_idx + 1]++;
    }

    for (std::size_t i = 0; i < num_nodes; ++i) {
        head_offsets[i + 1] += head_offsets[i];
    }

    // Copy sorted edges into contiguous vector
    std::vector<Edge> edges;
    edges.reserve(staged_edges_.size());
    for (const auto& e : staged_edges_) {
        edges.push_back(Edge{
            .target = e.to,
            .distance_meters = e.distance_meters,
            .speed_mps = e.speed_mps,
            .turn_penalty_flags = e.turn_penalty_flags
        });
    }

    return DirectedGraph(std::move(staged_nodes_), std::move(edges), std::move(head_offsets));
}

} // namespace routing
