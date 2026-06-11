# extract-graph

Build a directed weighted graph from ERC-20 `Transfer` events on Pharos.

## When to use

User asks: "build a graph of wallet X", "show me the on-chain social
graph of address Y", "map the relationships around this wallet", or
whenever the agent needs to understand wallet-to-wallet interactions.

## How it works

A breadth-first scan from a seed wallet. For each hop:

1. Pull `Transfer` events where the frontier wallet is `from` (topic1)
   **or** `to` (topic2).
2. Decode the event → `(from, to, token, value, block, txHash)`.
3. Add an edge to the graph, aggregated by `(from, to, token)`.
4. Add `to` and `from` to the next-hop frontier.
5. Repeat up to `--depth` (default 2).

The scan paginates `eth_getLogs` in 5,000-block chunks with
exponential backoff, so it works against rate-limited public RPCs.

## Reference command

```bash
node scripts/graph-extract.js \
  --seed 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \
  --depth 2 \
  --lookback 50000 \
  --network atlantic-testnet \
  --out output/graph.json
```

## Output schema

```json
{
  "meta": {
    "seed": "0x742d...",
    "network": "atlantic-testnet",
    "blockRange": { "from": 23850000, "to": 23895008 },
    "builtAt": "2026-06-11T10:00:00Z",
    "depth": 2
  },
  "nodes": {
    "0x742d...": {
      "address": "0x742d...",
      "firstSeen": 23850100,
      "lastSeen": 23894900,
      "txCount": 47,
      "sentCount": 22,
      "receivedCount": 25,
      "inDegree": 12,
      "outDegree": 10,
      "totalSentRaw": "1234500000000000000",
      "totalReceivedRaw": "987000000000000000",
      "counterparties": { "0xabcd...": 5, "0xbeef...": 3 }
    }
  },
  "edges": [
    {
      "from": "0x742d...",
      "to": "0xabcd...",
      "token": "0x...",
      "totalValueRaw": "500000000000000000",
      "count": 5,
      "firstSeen": 23850100,
      "lastSeen": 23894900,
      "sampleTxs": [ { "tx": "0x...", "value": "100000000000000000", "block": 23850100 } ]
    }
  ]
}
```

## Edge cases

- **No events in window** — the seed has no activity. Returns a graph
  with just the seed node and no edges. Not an error.
- **Seed is a contract** — works fine; you'll get the contract's
  outflows/inflows. To filter to EOAs only, use `detect-sybils` to
  score by funding pattern, or post-process with `isContract()`.
- **Self-transfers** — silently filtered (an edge from A to A is
  not a relationship).
- **RPC returns > 10k logs in one query** — `getLogsPaged` halts the
  page and re-tries the half-size chunks.
- **Memory pressure** — `--max-nodes` and `--max-edges` cap the BFS.
  Default 5k nodes / 20k edges. Tune if you have more headroom.
- **Out-of-funds or paused chain** — log scan will throw; the
  script catches per-wallet errors and continues.

## What the agent should say

After running, present a short summary:

```
[*] extracted graph in 23.4s
    seed: 0x742d…
    network: Atlantic testnet
    blocks: [23850000, 23895008]
    nodes: 412
    edges: 1,287
```

Then offer to run the next step: ego, clusters, PageRank, Sybils.

## Composition tips

- Run `extract-graph` **once** (slow), then run multiple analyzers
  on the JSON. The extract step is 90% of the time.
- Cap `--depth` at 3 unless you have a beefy machine. Depth 4+ on
  busy chains can produce 100k+ nodes.
- For Phase 2 Agents, cache the graph JSON keyed by
  `(seed, depth, lookback)` so re-running the agent doesn't re-scan.
