#!/usr/bin/env node
// pharos-social-graph / scripts/graph-pagerank.js
// Rank wallets by graph influence (PageRank).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pageRank } from "./lib/pagerank.js";

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
  if (!args.in) {
    console.error("usage: graph-pagerank.js --in graph.json [--damping 0.85] [--iterations 50] [--top 20] [--out pr.json]");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const damping = parseFloat(args.damping || "0.85");
  const iterations = parseInt(args.iterations || "50", 10);
  const top = parseInt(args.top || "20", 10);

  console.log(`[*] running PageRank on ${Object.keys(g.nodes).length} nodes (damping=${damping}, iter=${iterations})...`);
  const t0 = Date.now();
  const ranked = pageRank(g, { damping, iterations });
  console.log(`[*] done in ${Date.now() - t0}ms`);

  const result = {
    damping,
    iterations,
    stats: {
      nodeCount: Object.keys(g.nodes).length,
      edgeCount: g.edges.length,
    },
    ranking: ranked.slice(0, top).map((r) => ({
      rank: r.rank,
      address: r.address,
      score: r.score,
      txCount: g.nodes[r.address]?.txCount || 0,
      inDegree: g.nodes[r.address]?.inDegree || 0,
      outDegree: g.nodes[r.address]?.outDegree || 0,
    })),
  };

  const out = args.out;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`[ok] PageRank written to ${out}`);
    console.log(`     top 10 by influence:`);
    for (const r of result.ranking.slice(0, 10)) {
      console.log(`       #${r.rank}  ${r.address}  score=${r.score.toFixed(6)}  tx=${r.txCount}`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
