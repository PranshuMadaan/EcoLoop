#pragma once

#include <routing/common.hpp>
#include <routing/node.hpp>

#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

namespace routing {

namespace turn_flags {
inline constexpr std::uint8_t kNone = 0x00;
inline constexpr std::uint8_t kStraight = 0x01;
inline constexpr std::uint8_t kRight = 0x02;
inline constexpr std::uint8_t kLeft = 0x04;
inline constexpr std::uint8_t kUTurn = 0x08;
} // namespace turn_flags

// Directed edge stored within contiguous CSR buffer
struct Edge {
    NodeId target{0};
    double distance_meters{0.0};
    double speed_mps{0.0};
    std::uint8_t turn_penalty_flags{0};

    [[nodiscard]] bool operator==(const Edge& other) const noexcept = default;
};

// Forward declaration
class GraphBuilder;

// Immutable forward-star / Compressed Sparse Row (CSR) directed graph
class DirectedGraph {
public:
    DirectedGraph(std::vector<WasteNode> nodes,
                  std::vector<Edge> edges,
                  std::vector<std::size_t> head_offsets) noexcept;

    [[nodiscard]] std::size_t node_count() const noexcept { return nodes_.size(); }
    [[nodiscard]] std::size_t edge_count() const noexcept { return edges_.size(); }

    [[nodiscard]] const WasteNode& node(NodeId id) const;
    [[nodiscard]] std::span<const Edge> outgoing_edges(NodeId u) const;

    [[nodiscard]] std::span<const WasteNode> nodes() const noexcept { return nodes_; }
    [[nodiscard]] std::span<const Edge> edges() const noexcept { return edges_; }
    [[nodiscard]] std::span<const std::size_t> head_offsets() const noexcept { return head_offsets_; }

private:
    std::vector<WasteNode> nodes_;
    std::vector<Edge> edges_;
    std::vector<std::size_t> head_offsets_;
};

// Builder to stage nodes and directed edges, sort, index, and seal into DirectedGraph
class GraphBuilder {
public:
    GraphBuilder() = default;

    void add_node(WasteNode node);
    void add_edge(NodeId from, NodeId to, double distance_m, double speed_mps, std::uint8_t turn_flags = 0);

    [[nodiscard]] DirectedGraph build();

private:
    struct StagedEdge {
        NodeId from{0};
        NodeId to{0};
        double distance_meters{0.0};
        double speed_mps{0.0};
        std::uint8_t turn_penalty_flags{0};
    };

    std::vector<WasteNode> staged_nodes_;
    std::vector<StagedEdge> staged_edges_;
};

} // namespace routing
