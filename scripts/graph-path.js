#!/usr/bin/env node
// pharos-social-graph / scripts/graph-path.js
// Find the shortest money-flow path between two wallets.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { shortestPath } from "./lib/paths.js";

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
  if (!args.in || !args.from || !args.to) {
    console.error("usage: graph-path.js --in graph.json --from 0x... --to 0x... [--max-hops 6] [--out path.json]");
    process.exit(1);
  }
  if (!isAddr(args.from) || !isAddr(args.to)) {
    console.error("error: --from and --to must be 0x addresses");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const maxHops = parseInt(args["max-hops"] || "6", 10);

  const result = shortestPath(g, args.from, args.to, { maxHops });
  result.from = args.from.toLowerCase();
  result.to = args.to.toLowerCase();
  if (result.edges) {
    result.edge_summary = result.edges.map((e) => ({
      from: e.from,
      to: e.to,
      token: e.token,
      count: e.count,
      totalValueRaw: e.totalValueRaw,
    }));
  }

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(result, null, 2));
    console.log(`[ok] path written to ${args.out}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.path) {
    console.log(`\n[ok] path found: ${result.hopCount} hop(s), total weight ${result.totalWeight}`);
    for (let i = 0; i < result.path.length; i++) {
      const prefix = i === 0 ? "  " : "  ↓ ";
      console.log(`${prefix}${result.path[i]}`);
    }
  } else {
    console.log(`\n[!] no path found within ${maxHops} hops`);
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
