# detect-clusters

Find connected components and Louvain-style communities in the graph.

## When to use

User asks: "find me clusters of related wallets", "is this a Sybil
ring?", "how many distinct communities are in this graph?",
"show me the biggest cluster".

## Two algorithms

### 1. Connected components (BFS, undirected)

Treats the graph as undirected. Two wallets are in the same
component iff there's a path between them. Cheap (O(V+E)).

**Use when:** you want to know "is wallet A in the same network as
wallet B at all?".

### 2. Louvain-lite (greedy modularity)

Iterative, single-pass modularity maximization. Nodes start in their
own community; each iteration tries to move each node to a neighbor's
community if it increases modularity.

**Use when:** you want to know "is there a tight cluster of wallets
that move money together, distinct from the rest of the graph?".

## Reference command

```bash
node scripts/graph-clusters.js \
  --in output/graph.json \
  --top 20 \
  --out output/clusters.json
```

## Output

```json
{
  "stats": {
    "nodeCount": 412,
    "edgeCount": 1287,
    "componentCount": 3,
    "communityCount": 11
  },
  "components": [
    { "id": 1, "size": 405, "internalEdgeCount": 1281, "members": [...] },
    { "id": 2, "size": 5,   "internalEdgeCount": 4,    "members": [...] },
    { "id": 3, "size": 2,   "internalEdgeCount": 1,    "members": [...] }
  ],
  "communities": [
    { "id": 1, "size": 178, "members": [...] },
    { "id": 2, "size": 92,  "members": [...] }
  ]
}
```

## How to render

```
[*] 3 connected components
[*] 11 communities (Louvain-lite)
  top components by size:
    #1: 405 nodes, 1281 internal edges
    #2: 5 nodes, 4 internal edges
    #3: 2 nodes, 1 internal edge
  top communities by size:
    #1: 178 nodes
    #2: 92 nodes
    #3: 47 nodes
```

## Edge cases

- **One big component** — likely the testnet is small or the seed
  is a high-degree wallet. Try a smaller `--depth` or `--lookback`.
- **Many tiny components** — chain is fragmented. Common on
  testnets where wallets only have 1-2 transfers.
- **Louvain is non-deterministic** — small differences in iteration
  order can flip borderline nodes. For final reports, run twice and
  check stability.

## Future work

- Implement full Louvain (multi-level) for tighter communities.
- Add label-propagation as a faster alternative.
- Compute per-community metrics (modularity contribution, density,
  total value settled).
