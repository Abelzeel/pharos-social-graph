# export-report

Export a graph as Mermaid, DOT, or pretty-printed JSON for sharing.

## When to use

User wants to:
- Drop a diagram into a Notion page, GitHub README, or PR comment
  → Mermaid
- Open the graph in Graphviz → DOT
- Share a human-readable version of the data → JSON

## Reference command

### Mermaid (drop into any markdown)
```bash
node scripts/graph-export.js \
  --in output/graph.json \
  --format mermaid \
  --max-nodes 30 \
  --max-edges 60 \
  --out output/graph.mmd
```

Produces:
```
flowchart LR
  n742d35cc["0x742d…0bEb0"]
  nabcd123["0xabcd…0123"]
  nbeef456["0xbeef…0456"]
  n742d35cc -->|3 tx| nbeef456
  nbeef456 -->|5 tx| nabcd123
  ...
```

Paste this into any markdown file. GitHub, GitLab, Notion, and
Obsidian all render it.

### DOT (Graphviz)
```bash
node scripts/graph-export.js \
  --in output/graph.json \
  --format dot \
  --out output/graph.dot

dot -Tpng output/graph.dot -o output/graph.png
```

### Pretty JSON
```bash
node scripts/graph-export.js \
  --in output/graph.json \
  --format json \
  --max-nodes 30 \
  --max-edges 60 \
  --out output/graph-pretty.json
```

## Cap defaults

`--max-nodes 30` and `--max-edges 60` keep the diagram readable.
For dense graphs, increase these but know that >50 nodes in a
Mermaid diagram becomes hard to read.

## Edge cases

- **Mermaid limit** — Mermaid renderers have a soft limit around
  100 nodes. Above that, switch to DOT + Graphviz.
- **Label collision** — short labels (`0x742d…0bEb0`) are used to
  avoid overlap. Full addresses are still in the JSON source.
- **Layout** — Mermaid `flowchart LR` is a quick left-to-right.
  For a more polished layout, use DOT and run `unflatten` first.
