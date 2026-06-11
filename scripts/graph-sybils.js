#!/usr/bin/env node
// pharos-social-graph / scripts/graph-sybils.js
// Detect Sybil / coordinated-funder patterns.
// A Sybil cluster: many wallets funded by the same small set of
// "funder" wallets within a tight time window.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

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
    console.error("usage: graph-sybils.js --in graph.json [--min-cluster 3] [--out sybils.json]");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const minCluster = parseInt(args["min-cluster"] || "3", 10);

  // Build "funder → funded" map from incoming edges
  const fundMap = new Map(); // funder -> [{funded, block, token, value}]
  for (const e of g.edges) {
    if (!fundMap.has(e.from)) fundMap.set(e.from, []);
    fundMap.get(e.from).push({
      funded: e.to,
      block: e.firstSeen,
      token: e.token,
      value: e.totalValueRaw,
    });
  }

  // For each funder, group by token + tight time window
  const suspects = [];
  for (const [funder, list] of fundMap.entries()) {
    if (list.length < minCluster) continue;

    // Group by token
    const byToken = new Map();
    for (const f of list) {
      if (!byToken.has(f.token)) byToken.set(f.token, []);
      byToken.get(f.token).push(f);
    }

    for (const [token, txs] of byToken.entries()) {
      if (txs.length < minCluster) continue;
      // Sort by block
      txs.sort((a, b) => (a.block || 0) - (b.block || 0));
      // Find tight windows: 5 successive txs within 1000 blocks of each other
      const tight = [];
      let cur = [];
      for (let i = 0; i < txs.length; i++) {
        if (cur.length === 0) { cur.push(txs[i]); continue; }
        const last = cur[cur.length - 1];
        const span = (txs[i].block || 0) - (last.block || 0);
        if (span <= 1000) {
          cur.push(txs[i]);
        } else {
          if (cur.length >= minCluster) tight.push(cur);
          cur = [txs[i]];
        }
      }
      if (cur.length >= minCluster) tight.push(cur);

      for (const window of tight) {
        suspects.push({
          funder,
          token,
          clusterSize: window.length,
          blockRange: [window[0].block, window[window.length - 1].block],
          blockSpan: (window[window.length - 1].block || 0) - (window[0].block || 0),
          fundedWallets: window.map((w) => w.funded),
        });
      }
    }
  }

  // Sort by cluster size desc
  suspects.sort((a, b) => b.clusterSize - a.clusterSize);

  const result = {
    stats: {
      funderCount: fundMap.size,
      suspectClusterCount: suspects.length,
    },
    threshold: {
      minClusterSize: minCluster,
      maxBlockSpan: 1000,
    },
    suspects: suspects.slice(0, parseInt(args.top || "50", 10)),
  };

  const out = args.out;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`[ok] sybil report written to ${out}`);
    console.log(`     scanned ${result.stats.funderCount} funders`);
    console.log(`     flagged ${result.stats.suspectClusterCount} suspect clusters`);
    for (const s of result.suspects.slice(0, 5)) {
      console.log(`       funder=${s.funder}  cluster=${s.clusterSize}  token=${s.token}  span=${s.blockSpan} blocks`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
