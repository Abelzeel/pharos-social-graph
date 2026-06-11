#!/usr/bin/env node
// pharos-social-graph / scripts/graph-export.js
// Export a graph as Mermaid, DOT, or pretty JSON.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { toMermaid, toDOT } from "./lib/export.js";

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
  if (!args.in || !args.format) {
    console.error("usage: graph-export.js --in graph.json --format mermaid|dot|json [--out file] [--max-nodes 30] [--max-edges 60]");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const maxNodes = parseInt(args["max-nodes"] || "30", 10);
  const maxEdges = parseInt(args["max-edges"] || "60", 10);
  const title = args.title || g.meta?.seed ? `Social graph for ${g.meta.seed}` : undefined;

  let out = "";
  if (args.format === "mermaid") {
    out = toMermaid(g, { maxNodes, maxEdges, title });
  } else if (args.format === "dot") {
    out = toDOT(g, { maxNodes, maxEdges });
  } else if (args.format === "json") {
    // Pretty-print with top nodes/edges only
    const nodes = Object.entries(g.nodes)
      .sort((a, b) => (b[1].txCount || 0) - (a[1].txCount || 0))
      .slice(0, maxNodes);
    const topAddrs = new Set(nodes.map(([k]) => k));
    const edges = g.edges
      .filter((e) => topAddrs.has(e.from) && topAddrs.has(e.to))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, maxEdges);
    out = JSON.stringify(
      { meta: g.meta, nodes: Object.fromEntries(nodes), edges },
      null,
      2
    );
  } else {
    console.error("error: --format must be mermaid, dot, or json");
    process.exit(1);
  }

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, out);
    console.log(`[ok] exported ${args.format} (${out.length} bytes) to ${args.out}`);
  } else {
    console.log(out);
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
