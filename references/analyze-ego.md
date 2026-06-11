# analyze-ego

Show the ego network (N-hop neighborhood) of a single wallet.

## When to use

User asks: "who does this wallet interact with?", "show me the
neighborhood of address X", or "find me related wallets".

## Reference command

```bash
node scripts/graph-ego.js \
  --in output/graph.json \
  --seed 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \
  --depth 2 \
  --top 20 \
  --out output/ego.json
```

## Output

```json
{
  "seed": "0x742d...",
  "depth": 2,
  "stats": { "nodeCount": 89, "edgeCount": 312 },
  "top_counterparties": [
    { "address": "0xabcd...", "txCount": 47, "sent": 22, "received": 25 },
    { "address": "0xbeef...", "txCount": 31, "sent": 15, "received": 16 }
  ],
  "full_ego_graph": { ... }
}
```

## How to render in chat

```
Ego network of 0x742d… (2 hops):
  nodes: 89
  edges: 312

  Top 5 counterparties (by tx count):
    1. 0xabcd…  — 47 tx (sent 22, received 25)
    2. 0xbeef…  — 31 tx
    3. 0x1234…  — 18 tx
    4. 0x5678…  — 12 tx
    5. 0x9abc…  —  9 tx
```

## Edge cases

- **Seed not in graph** — returns an empty ego (0 nodes). The user
  probably gave a wrong address or the depth was too small.
- **Depth 0** — returns just the seed node.
- **Very large ego** — cap output. Default `--top 20`. The full graph
  is still in `full_ego_graph` for downstream tools.
