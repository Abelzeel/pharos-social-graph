#!/usr/bin/env node
// pharos-social-graph / scripts/graph-ego.js
// Show the ego network (N-hop neighborhood) of a wallet.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { egoGraph, topCounterparties, graphStats } from "./lib/graph.js";

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

async function main() {
  const args = parseArgs();
  if (!args.in || !args.seed) {
    console.error("usage: graph-ego.js --in graph.json --seed 0x... [--depth 2] [--out ego.json] [--top 20]");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const depth = parseInt(args.depth || "2", 10);
  const top = parseInt(args.top || "20", 10);

  const ego = egoGraph(g, args.seed, depth);
  const topCp = topCounterparties(g, args.seed, top);

  const result = {
    seed: args.seed.toLowerCase(),
    depth,
    stats: graphStats(ego),
    top_counterparties: topCp.map((c) => ({
      address: c.address,
      txCount: c.txCount,
      sent: c.node?.sentCount || 0,
      received: c.node?.receivedCount || 0,
    })),
    full_ego_graph: ego,
  };

  const out = args.out;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`[ok] ego network written to ${out}`);
    console.log(`     nodes=${result.stats.nodeCount}  edges=${result.stats.edgeCount}`);
    console.log(`     top counterparties:`);
    for (const c of result.top_counterparties.slice(0, 10)) {
      console.log(`       ${c.address}  (${c.txCount} tx)`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
