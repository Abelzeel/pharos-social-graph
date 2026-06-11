#!/usr/bin/env node
// pharos-social-graph / scripts/graph-clusters.js
// Find connected components + community clusters.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { connectedComponents, detectCommunities } from "./lib/clusters.js";

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
    console.error("usage: graph-clusters.js --in graph.json [--out clusters.json] [--top 20]");
    process.exit(1);
  }
  const g = JSON.parse(readFileSync(args.in, "utf8"));
  const top = parseInt(args.top || "20", 10);

  const components = connectedComponents(g);
  const communities = detectCommunities(g);

  const result = {
    stats: {
      nodeCount: Object.keys(g.nodes).length,
      edgeCount: g.edges.length,
      componentCount: components.length,
      communityCount: communities.length,
    },
    components: components.slice(0, top).map((c) => ({
      id: c.id,
      size: c.size,
      internalEdgeCount: c.internalEdgeCount,
      members: c.members.slice(0, 50),  // cap member list
    })),
    communities: communities.slice(0, top).map((c) => ({
      id: c.id,
      size: c.size,
      members: c.members.slice(0, 50),
    })),
  };

  const out = args.out;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`[ok] clusters written to ${out}`);
    console.log(`     ${result.stats.componentCount} connected components`);
    console.log(`     ${result.stats.communityCount} communities (Louvain-lite)`);
    console.log(`     top 5 components by size:`);
    for (const c of result.components.slice(0, 5)) {
      console.log(`       #${c.id}: ${c.size} nodes, ${c.internalEdgeCount} edges`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
