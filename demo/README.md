# Demo video script — Pharos Social Graph

A 90-second walkthrough you can record with Loom and submit to DoraHacks.

## Setup (do this before recording)

```bash
# 1. Clone
git clone https://github.com/Abelzeel/pharos-social-graph.git
cd pharos-social-graph

# 2. Node 18+ — that's it, no npm install needed
node --version
```

## Scene-by-scene (90 seconds total)

### Scene 1 — Hook (0:00–0:10)
> "When an AI Agent moves value on Pharos, it needs to know who
> it's actually dealing with. Not just a balance — the *relationships*.
> Pharos Social Graph turns on-chain activity into a queryable
> social graph, then runs real graph-theory algorithms on it."

### Scene 2 — The extract (0:10–0:35)
Run the one-shot report:
```bash
node scripts/graph-report.js \
  --seed 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \
  --depth 2 \
  --lookback 50000 \
  --network atlantic-testnet
```
Show the streaming output:
- "[1/5] extracting graph..."
- "[2/5] ego network..."
- "[3/5] connected components + communities..."
- "[4/5] PageRank..."
- "[5/5] writing report + Mermaid..."

### Scene 3 — The report (0:35–0:55)
Open `output/report.json` in VS Code. Walk through:
- stats (nodes, edges, components, communities)
- top_pagerank (who's influential)
- top_counterparties (who they trade with)

### Scene 4 — The diagram (0:55–1:25)
Open `output/graph.mmd` in VS Code. Show the Mermaid code, then
render it in a markdown preview pane (VS Code does this with
Markdown Preview Mermaid Support). Point at the structure.

### Scene 5 — Wrap (1:25–1:30)
> "Zero npm dependencies. Pure Node 18+. Read-only. MIT-0.
> Drop-in for Anvita Flow. Composes with `pharos-approval-shield`
> in Phase 2."

## Files referenced in the demo

- `demo/sample-graph.json` — example graph (3 wallets, 4 edges)
- `output/report.json` — the full structured report
- `output/graph.mmd` — the Mermaid diagram
- `SKILL.md` — the Skill definition the Agent reads

## What to include in the DoraHacks submission

1. **GitHub repo link** (this repo)
2. **Demo video** (≤ 3 minutes, upload to YouTube or Loom)
3. **Short description** (~150 words) explaining the problem and solution
4. **Tags**: AgentSkill, Onchain, GraphAnalysis, Pharos, Anvita
