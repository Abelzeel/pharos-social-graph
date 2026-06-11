# Pharos Social Graph

> 🌐 **Live demo:** [pxg0cgwhyjf9.space.minimax.io](https://pxg0cgwhyjf9.space.minimax.io)
> — try the chat agent right in your browser, no install.

A Node.js **Skill** for AI Agents operating on Pharos. Turns on-chain
`Transfer` events into a queryable social graph and runs real
graph-theory algorithms on it.

Built for the **Skill-to-Agent Dual Cascade Hackathon** on Pharos × Anvita
Flow (Phase 1: Skill Hackathon, June 8 – June 15, 2026).

---

## What problem does this solve?

When an AI Agent moves value on Pharos, it needs more than balance
lookups. It needs **context about the wallets it interacts with**:

- Is this wallet funded by a known cluster of related addresses?
- Are these 30 wallets one person operating 30 accounts (Sybil)?
- Who is the most influential wallet in a DeFi protocol's user base?
- What is the shortest money-flow path from this donor to that recipient?
- How did the social graph evolve over the last 10,000 blocks?

This Skill answers all of those, **read-only**, with **zero npm
dependencies**.

## Why it's original

The official `pharos-skill-engine` ships a generic on-chain toolkit
(balance, deploy, verify). It does **not** ship:
- Graph extraction
- PageRank
- Community detection
- Path finding
- Sybil flagging

And the Pharos blog literally says *"Use the new agents to build
your on-chain social graph"* — but no Skill does this yet.

This is the first Skill that:
- Targets the Pharos network specifically
- Runs entirely in Node 18+ with **zero npm dependencies**
- Exposes 7 composable capabilities via a `SKILL.md` Agent entry point
- Outputs standard formats (JSON, Mermaid, DOT) the Agent can
  summarize or render

## Quick start

```bash
# 1. Get the code
git clone https://github.com/Abelzeel/pharos-social-graph.git
cd pharos-social-graph

# 2. Run a one-shot report (Node 18+ only — no npm install needed)
node scripts/graph-report.js \
  --seed 0xa690a947ea3326074db114090b3a6a13ad4c7d77 \
  --depth 2 \
  --lookback 1000 \
  --out output/report.json

# 3. Drop the Mermaid diagram into a markdown file
cat output/graph.mmd
```

## Architecture

```
SKILL.md                ← entry point, agent reads this first
package.json            ← zero deps, Node 18+ only
references/             ← 7 deep-dive docs the agent pulls per task
assets/
  ├── networks.json         ← Pharos RPC config
  └── known-contracts.json  ← address allowlist (DEX, CEX, etc.)
scripts/
  ├── lib/
  │   ├── rpc.js            ← JSON-RPC + retry + paginated getLogs
  │   ├── graph.js          ← Graph data structure + ops
  │   ├── pagerank.js       ← Power-iteration PageRank
  │   ├── clusters.js       ← Connected components + Louvain-lite
  │   ├── paths.js          ← BFS shortest path
  │   └── export.js         ← JSON / Mermaid / DOT
  ├── graph-extract.js      ← CLI: build the graph
  ├── graph-ego.js          ← CLI: ego network
  ├── graph-clusters.js     ← CLI: cluster detection
  ├── graph-pagerank.js     ← CLI: PageRank
  ├── graph-path.js         ← CLI: shortest path
  ├── graph-sybils.js       ← CLI: Sybil detection
  ├── graph-export.js       ← CLI: Mermaid/DOT export
  └── graph-report.js       ← CLI: one-shot full report
demo/
  ├── README.md             ← demo video script
  └── sample-graph.json     ← example output
tests/
  └── test-graph.js         ← invariant tests
```

## Capabilities (one-line summary)

| Capability | Use when… |
|-----------|-----------|
| `extract-graph` | Building a graph from Transfer events around a seed |
| `analyze-ego` | Showing the N-hop neighborhood of one wallet |
| `detect-clusters` | Finding connected components + Louvain communities |
| `rank-influence` | Ranking wallets by PageRank |
| `find-path` | Shortest money-flow path A → B |
| `detect-sybils` | Flagging coordinated-funder patterns |
| `export-report` | Rendering as Mermaid / DOT / JSON |
| `full-report` | One-shot pipeline producing report + diagram |

## Why Node.js, not Python?

- **The Agent ecosystem is JS-native.** Most AI Agent runtimes
  (Claude Code, OpenClaw, Codex, LangChain JS, Vercel AI SDK) speak
  JavaScript first. A Node.js Skill drops in without a Python venv.
- **Zero `npm install`.** The Skill uses only Node 18+ built-ins
  (`fs`, `path`, `fetch`, `node:stream`). Stock Node, no surprises.
- **`ethers.js` is a one-line add** if you want ABI decoding later.
  The current version uses raw `eth_call` to stay dep-free.

## License

MIT-0 — free to use, modify, redistribute. No attribution required.
