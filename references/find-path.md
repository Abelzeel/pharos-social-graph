# find-path

Find the shortest money-flow path between two wallets using BFS.

## When to use

User asks: "trace the money from A to B", "are these two wallets
connected?", "what's the shortest path from this donor to that
recipient?".

## How it works

Standard BFS on the directed graph. Returns:

- The sequence of wallets
- The sequence of edges (with token, count, total value)
- The hop count and total weight (sum of edge counts)

Caps at `--max-hops` (default 6) to avoid exponential blowup on
highly connected graphs.

## Reference command

```bash
node scripts/graph-path.js \
  --in output/graph.json \
  --from 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \
  --to 0xabcd000000000000000000000000000000000001 \
  --max-hops 6 \
  --out output/path.json
```

## Output

```json
{
  "from": "0x742d…",
  "to":   "0xabcd…",
  "path": ["0x742d…", "0xbeef…", "0xabcd…"],
  "edges": [ { "from": "0x742d…", "to": "0xbeef…", "token": "0x...", "count": 3, "totalValueRaw": "..." } ],
  "hopCount": 2,
  "totalWeight": 5
}
```

If no path is found:
```json
{ "from": "0x742d…", "to": "0xabcd…", "path": null, "hopCount": -1, "totalWeight": 0 }
```

## How to render in chat

```
[ok] path found: 2 hops, total weight 5
  0x742d…
  ↓
  0xbeef…  (3 tx, value=0.5 ETH)
  ↓
  0xabcd…
```

Or for no path:
```
[!] no path found within 6 hops
```

## Edge cases

- **Same address for from and to** — returns a 0-hop path.
- **Either address not in graph** — returns `path: null`.
- **Cycle in graph** — BFS handles it via visited set.
- **Very long path** — capped at `--max-hops`. Increase if you
  know what you're doing.
- **Many equal-length paths** — only the first one BFS finds is
  returned. For all shortest paths, modify `paths.js`.

## Limitations

- This finds **one** path, not all paths. For a money-laundering
  investigation you'd want all paths and their value flows.
- No time constraint — could include transfers from 2 years ago.
  For fresh-money tracing, filter edges by `lastSeen` first.

## Future work

- K-shortest paths (Yen's algorithm)
- Weighted shortest path (Dijkstra)
- Time-windowed path finding
