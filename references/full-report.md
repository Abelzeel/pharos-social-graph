# full-report

One-shot: extract + ego + clusters + PageRank + Sybils + Mermaid export.

## When to use

User wants "the whole picture" — just give me everything about this
wallet's neighborhood.

This is the most user-friendly entry point. It chains all the other
capabilities and produces both:
- A `report.json` with structured findings
- A `graph.mmd` Mermaid diagram

## Reference command

```bash
node scripts/graph-report.js \
  --seed 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \
  --depth 2 \
  --lookback 50000 \
  --network atlantic-testnet \
  --out output/report.json \
  --graph-out output/graph.json \
  --mermaid-out output/graph.mmd
```

## Output

`output/report.json`:
```json
{
  "seed": "0x742d…",
  "network": "atlantic-testnet",
  "builtAt": "2026-06-11T...",
  "stats": {
    "nodeCount": 412,
    "edgeCount": 1287,
    "egoNodeCount": 89,
    "egoEdgeCount": 312,
    "componentCount": 3,
    "communityCount": 11
  },
  "top_counterparties": [...],
  "top_components_by_size": [...],
  "top_communities_by_size": [...],
  "top_pagerank": [...]
}
```

`output/graph.mmd`: Mermaid flowchart, ready to paste.

## Pipeline timing

Typical 2-hop scan on Atlantic testnet with ~10k Transfer events:
- Extract: ~15-30 seconds (RPC-bound)
- Ego: <1s
- Clusters: <1s
- PageRank: <1s for 1k nodes
- Report: <1s

So most of the wait is `extract-graph`. The other stages are
in-memory and instant.

## When NOT to use this

- If you only want one specific analysis (e.g. just PageRank), call
  the individual script. Faster and produces a smaller artifact.
- If you're integrating into an Agent that needs to call each step
  conditionally based on results, don't use this — call the
  individual scripts.

## What the agent should say

After completion, the agent has:
- A structured `report.json` to summarize
- A `graph.mmd` to render in any markdown surface
- Optionally, run the Sybil scan separately if a cluster looks
  suspicious

A good chat reply:

```
Social graph analysis for 0x742d… (depth 2, 50k blocks back):
  nodes:        412
  edges:        1,287
  components:   3
  communities:  11

  Top 3 PageRank:
    #1  0xabcd…  (score 0.041, 187 tx)
    #2  0xbeef…  (score 0.039, 142 tx)
    #3  0x1234…  (score 0.029,  98 tx)

  [Mermaid diagram dropped below]

Want me to run Sybil detection on the biggest funder?
```
