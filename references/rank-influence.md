# rank-influence

Rank wallets by graph influence using PageRank — the same algorithm
Google uses for web pages.

## When to use

User asks: "who is the most important wallet in this network?",
"rank by influence", "which wallet would I trust to settle the
most volume?".

## How PageRank works on a money graph

The intuition: a wallet is "influential" if it receives transfers
from other influential wallets, weighted by how much they send.

```
PR(A) = (1 - d) / N + d * sum( PR(T) / outWeight(T) for T sending to A )
```

Where `d` is the damping factor (default 0.85) and `outWeight(T)` is
the total transfer-out volume of T.

This is computed by power iteration until convergence (or `--iterations`
iterations, default 50).

## Reference command

```bash
node scripts/graph-pagerank.js \
  --in output/graph.json \
  --damping 0.85 \
  --iterations 50 \
  --top 20 \
  --out output/pagerank.json
```

## Output

```json
{
  "damping": 0.85,
  "iterations": 30,
  "stats": { "nodeCount": 412, "edgeCount": 1287 },
  "ranking": [
    { "rank": 1, "address": "0xabcd…", "score": 0.04123, "txCount": 187, "inDegree": 89, "outDegree": 98 },
    { "rank": 2, "address": "0xbeef…", "score": 0.03891, "txCount": 142, "inDegree": 67, "outDegree": 75 }
  ]
}
```

## How to render in chat

```
Top 5 by PageRank:
  #1  0xabcd…  score=0.0412  tx=187
  #2  0xbeef…  score=0.0389  tx=142
  #3  0x1234…  score=0.0291  tx=98
  #4  0x5678…  score=0.0203  tx=76
  #5  0x9abc…  score=0.0177  tx=54
```

## Edge cases

- **Dangling nodes (no outgoing edges)** — their PageRank is
  redistributed evenly across the graph. This is standard.
- **Single node** — that node has rank 1/N, score 1.
- **Disconnected graph** — PageRank still works, but each component
  converges independently. The "global" rank may not be meaningful
  if the graph is wildly fragmented.
- **Very dense hub** — a single high-degree wallet can dominate. This
  is usually correct but worth flagging to the user.

## Limitations

- PageRank is **structural**, not financial. A wallet that receives
  dust from a million wallets ranks higher than one that receives
  one large transfer. Use with judgment.
- Doesn't account for **time**. A wallet that was influential 6
  months ago but dormant now will still rank high.
- For value-weighted influence, use `totalReceivedRaw` instead.

## Future work

- Weighted PageRank (weight = total value, not just count)
- Personalized PageRank (seed-biased)
- Time-decayed PageRank
