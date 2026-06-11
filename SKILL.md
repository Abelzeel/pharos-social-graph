---
name: pharos-social-graph
description: >
  REQUIRED whenever a Pharos Agent needs to map wallet relationships,
  identify clusters, rank influence, find money-flow paths, or detect
  Sybil patterns. Invoked for tasks like "who funds this wallet?",
  "find similar wallets to X", "show me the on-chain social graph of
  address Y", "rank top influencers", "is this a Sybil cluster?",
  "trace the money path from A to B". Builds a directed weighted
  graph from ERC-20 Transfer events and runs graph-theory algorithms
  (PageRank, connected components, ego networks, shortest paths).
  Without this Skill the Agent has no way to see wallet-to-wallet
  relationships on Pharos.
version: 0.1.0
requires:
  runtime: "node >= 18"
  anyBins:
    - node
---

# Pharos Social Graph

A Node.js Skill that turns on-chain activity into a queryable social
graph. Built for AI Agents operating on Pharos that need to understand
**relationships between wallets** — who pays whom, who funds who, who
clusters together.

Composes with `pharos-skill-engine` (uses the same RPC config) and is
designed to be consumed by Anvita Flow agents in Phase 2.

## What This Skill Is For

An Agent that holds allowances or moves value on Pharos needs more
than balance lookups. It needs **context** about the wallets it
interacts with:

- Is this wallet funded by a known cluster of related addresses?
- Are these 30 wallets one person operating 30 accounts (Sybil)?
- Who is the most influential wallet in a DeFi protocol's user base?
- What is the shortest money-flow path from this donor to that recipient?
- How did the social graph evolve over the last 10,000 blocks?

This Skill answers all of those, in read-only mode.

## Capabilities (Index)

| User Need | Capability | Detailed Instructions |
|-----------|-----------|----------------------|
| Pull Transfer events and build a graph | `extract-graph` | → `references/extract-graph.md` |
| Show a wallet's 1-hop neighborhood | `analyze-ego` | → `references/analyze-ego.md` |
| Find connected communities / cliques | `detect-clusters` | → `references/detect-clusters.md` |
| Rank wallets by graph influence (PageRank) | `rank-influence` | → `references/rank-influence.md` |
| Find shortest money-flow path A → B | `find-path` | → `references/find-path.md` |
| Detect Sybil / coordinated-funder patterns | `detect-sybils` | → `references/detect-sybils.md` |
| Export the graph as JSON / Mermaid / DOT | `export-report` | → `references/export-report.md` |
| One-shot full analysis on a seed wallet | `full-report` | → `references/full-report.md` |

## Prerequisites

1. **Node.js 18 or newer** (uses native `fetch`).
2. **An RPC endpoint** for the target Pharos network (defaults to the
   Atlantic testnet public RPC).
3. **Read-only operations only** — this Skill never signs transactions.

## Network Configuration

Reads from `assets/networks.json` (relative to this Skill). Default is
`atlantic-testnet`. The schema matches `pharos-skill-engine`.

```js
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const networks = JSON.parse(
  readFileSync(join(__dirname, "assets/networks.json"), "utf8")
);
const net = networks.networks.find((n) => n.name === "atlantic-testnet");
const RPC_URL = net.rpcUrl;
```

## Quick Start

```bash
# 1. Install (zero deps required — uses node: built-ins only)
cd pharos-social-graph
# No `npm install` needed. The Skill uses only Node 18+ built-ins.

# 2. Build a graph for a seed wallet (depth = 2 hops)
node scripts/graph-extract.js \
  --seed 0xYourWallet... \
  --depth 2 \
  --out output/graph.json

# 3. Run a full report (clusters + PageRank + ego + Sybil)
node scripts/graph-report.js \
  --seed 0xYourWallet... \
  --depth 2 \
  --out output/report.json

# 4. Render the graph to Mermaid (drop into any markdown / GitHub)
node scripts/graph-export.js \
  --in output/graph.json \
  --format mermaid \
  --out output/graph.mmd
```

## How an Agent Should Use This Skill

**Step A — Detect intent.** When the user says "who else is this wallet
connected to?", "find similar wallets", "show me the social graph of
X", or any time the agent needs context about a counter-party —
**invoke this Skill first**.

**Step B — Run `extract-graph`.** Provide a seed address and a depth
(default 2 hops). The Skill pulls `Transfer` events, builds a directed
weighted graph in memory, and writes a JSON snapshot to `output/`.

**Step C — Run analyzers.** Call any of `analyze-ego`, `detect-clusters`,
`rank-influence`, `find-path`, `detect-sybils`. Each takes the JSON
graph as input and returns a structured JSON result.

**Step D — Render.** For chat replies, summarize the top results. For
long-form reports, generate a Mermaid diagram the user can drop into
Notion / GitHub / a PR.

**Step E — Combine with other Skills.** This Skill is **pure
read-only** and **stateless** between runs. Compose it with:
- `pharos-approval-shield` to flag risky clusters
- `pharos-skill-engine` to look up balances of top influencers
- Anvita Flow agent for scheduled "new cluster" alerts

## Security Reminders

- **Read-only by default.** This Skill never signs transactions. All
  scripts that produce transactions require an explicit
  `--i-understand-write` flag.
- **No private keys needed.** The Skill only reads public chain state.
- **Mainnet confirmation.** On `--network mainnet`, every script
  prints a `⚠️ MAINNET` banner before reading. Agents must re-confirm
  with the user before any mainnet run.
- **Result size limits.** A naive depth-5 scan can produce 100k+ nodes
  and OOM the Node process. Always cap `--depth` and `--max-nodes`.

## General Error Handling

| Error Scenario | CLI Error Signature | Handling |
|----------------|---------------------|----------|
| RPC unreachable | `ECONNREFUSED` / fetch failed | Retry once with `--rpc-fallback`; if still failing, ask user for alternate RPC |
| Invalid seed address | `invalid address` | Prompt the user to re-check the seed |
| No Transfer events found | empty logs | Report "no activity in window" — not an error |
| Block range too large | `query returned > 10000 results` | Reduce `--lookback-blocks` or split into chunks |
| Result too large to fit memory | `JavaScript heap out of memory` | Cap `--max-nodes`; reduce depth |
| `--network mainnet` w/o confirmation | script refuses | Require user re-confirm |

## Files In This Skill

```
pharos-social-graph/
├── SKILL.md                          # this file
├── package.json                      # zero deps, but for npm ergonomics
├── references/
│   ├── extract-graph.md
│   ├── analyze-ego.md
│   ├── detect-clusters.md
│   ├── rank-influence.md
│   ├── find-path.md
│   ├── detect-sybils.md
│   ├── export-report.md
│   └── full-report.md
├── assets/
│   ├── networks.json                 # Pharos networks (testnet + mainnet)
│   └── known-contracts.json          # DEX, CEX, bridge, deployer allowlist
├── scripts/
│   ├── lib/
│   │   ├── rpc.js                    # JSON-RPC + retry + fallback
│   │   ├── graph.js                  # Graph data structure + ops
│   │   ├── pagerank.js               # PageRank implementation
│   │   ├── clusters.js               # Connected components + Louvain-lite
│   │   ├── paths.js                  # BFS shortest path
│   │   └── export.js                 # JSON / Mermaid / DOT
│   ├── graph-extract.js              # CLI: build a graph from Transfer events
│   ├── graph-ego.js                  # CLI: ego network
│   ├── graph-clusters.js             # CLI: connected components
│   ├── graph-pagerank.js             # CLI: PageRank
│   ├── graph-path.js                 # CLI: shortest path
│   ├── graph-sybils.js               # CLI: Sybil detection
│   ├── graph-export.js               # CLI: Mermaid / DOT export
│   └── graph-report.js               # CLI: full one-shot report
├── demo/
│   ├── README.md                     # demo video script
│   └── sample-graph.json             # example output
├── tests/
│   └── test-graph.js                 # basic invariant tests
├── output/                           # .gitignored, where runs land
├── README.md
└── LICENSE                           # MIT-0
```

## Why JavaScript / Node.js?

- **The Agent ecosystem is JS-native.** Most AI Agent runtimes
  (Claude Code, OpenClaw, Codex, LangChain JS, Vercel AI SDK) speak
  JavaScript first. A Node.js Skill drops in without a Python venv
  headache.
- **Streams + async iterators** are perfect for paginating RPC `eth_getLogs`
  calls without OOM.
- **`ethers.js` v6** is the de-facto EVM SDK, with first-class TypeScript
  types, tree-shakeable, and zero native deps.
- **No `pip` to install.** Zero `dependencies` in `package.json` —
  the Skill runs on stock Node 18+.

## License

MIT-0 — free to use, modify, redistribute. No attribution required.
(Same as `pharos-skill-engine` and `pharos-approval-shield`.)
