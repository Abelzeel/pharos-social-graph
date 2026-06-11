#!/usr/bin/env node
// pharos-social-graph / scripts/graph-report.js
// One-shot full report: extract + ego + clusters + PageRank + sybils + export.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { egoGraph, graphStats } from "./lib/graph.js";
import { connectedComponents, detectCommunities } from "./lib/clusters.js";
import { pageRank } from "./lib/pagerank.js";
import { toMermaid } from "./lib/export.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      out[a.slice(2)] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
    }
  }
  return out;
}

function isAddr(s) {
  return typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s);
}

async function main() {
  const args = parseArgs();
  if (!args.seed || !isAddr(args.seed)) {
    console.error("usage: graph-report.js --seed 0x... [--depth 2] [--lookback 50000] [--network atlantic-testnet] [--out output/report.json]");
    process.exit(1);
  }
  const depth = parseInt(args.depth || "2", 10);
  const lookback = parseInt(args.lookback || "50000", 10);
  const network = args.network || "atlantic-testnet";
  const outPath = args.out || "output/report.json";
  const graphPath = args["graph-out"] || "output/graph.json";
  const mermaidPath = args["mermaid-out"] || "output/graph.mmd";

  // Step 1: build the graph (delegate to graph-extract.js)
  console.log(`[1/5] extracting graph (seed=${args.seed}, depth=${depth}, lookback=${lookback})...`);
  execSync(
    `node "${join(SKILL_ROOT, "scripts", "graph-extract.js")}" --seed ${args.seed} --depth ${depth} --lookback ${lookback} --network ${network} --out ${graphPath}`,
    { stdio: "inherit", cwd: SKILL_ROOT }
  );
  const g = JSON.parse(readFileSync(graphPath, "utf8"));

  // Step 2: ego network + top counterparties
  console.log(`\n[2/5] ego network...`);
  const ego = egoGraph(g, args.seed, depth);
  const seedNode = g.nodes[args.seed.toLowerCase()];
  const topCp = seedNode
    ? Object.entries(seedNode.counterparties)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([address, count]) => ({ address, txCount: count }))
    : [];

  // Step 3: clusters
  console.log(`[3/5] connected components + communities...`);
  const components = connectedComponents(g);
  const communities = detectCommunities(g);

  // Step 4: PageRank
  console.log(`[4/5] PageRank...`);
  const ranked = pageRank(g, { iterations: 30 }).slice(0, 20);

  // Step 5: assemble report + export Mermaid
  console.log(`[5/5] writing report + Mermaid...`);
  const report = {
    seed: args.seed.toLowerCase(),
    network,
    builtAt: new Date().toISOString(),
    stats: {
      ...graphStats(g),
      egoNodeCount: Object.keys(ego.nodes).length,
      egoEdgeCount: ego.edges.length,
      componentCount: components.length,
      communityCount: communities.length,
    },
    top_counterparties: topCp,
    top_components_by_size: components.slice(0, 10).map((c) => ({
      id: c.id,
      size: c.size,
      internalEdgeCount: c.internalEdgeCount,
    })),
    top_communities_by_size: communities.slice(0, 10).map((c) => ({
      id: c.id,
      size: c.size,
    })),
    top_pagerank: ranked.map((r) => ({
      rank: r.rank,
      address: r.address,
      score: r.score,
      txCount: g.nodes[r.address]?.txCount || 0,
    })),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[ok] report written to ${outPath}`);

  const mmd = toMermaid(g, { maxNodes: 25, maxEdges: 40, title: `Social graph for ${args.seed}` });
  writeFileSync(mermaidPath, mmd);
  console.log(`[ok] Mermaid diagram written to ${mermaidPath}`);

  // Pretty summary
  console.log(`\n=== Pharos Social Graph — Report ===`);
  console.log(`  seed:              ${args.seed}`);
  console.log(`  network:           ${network}`);
  console.log(`  total nodes:       ${report.stats.nodeCount}`);
  console.log(`  total edges:       ${report.stats.edgeCount}`);
  console.log(`  components:        ${report.stats.componentCount}`);
  console.log(`  communities:       ${report.stats.communityCount}`);
  console.log(`\n  Top 5 PageRank:`);
  for (const r of report.top_pagerank.slice(0, 5)) {
    console.log(`    #${r.rank}  ${r.address}  (score=${r.score.toFixed(6)}, ${r.txCount} tx)`);
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
