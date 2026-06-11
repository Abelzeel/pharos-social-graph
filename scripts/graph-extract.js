#!/usr/bin/env node
// pharos-social-graph / scripts/graph-extract.js
//
// Build a directed weighted graph from ERC-20 Transfer events.
// Walks BFS from a seed address to N hops deep.
//
// Usage:
//   node graph-extract.js --seed 0x... [--depth 2] [--lookback 50000]
//                         [--network atlantic-testnet] [--out output/graph.json]
//                         [--max-nodes 5000] [--max-edges 20000]

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveRpcUrl, getBlockNumber, getLogsPaged } from "./lib/rpc.js";
import { createGraph, addEdge, ensureNode, graphStats } from "./lib/graph.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      out[k] = v;
    }
  }
  return out;
}

function isAddr(s) {
  return typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s);
}

async function main() {
  const args = parseArgs();
  const seed = args.seed;
  if (!isAddr(seed)) {
    console.error("error: --seed must be a 0x-prefixed 40-hex address");
    process.exit(1);
  }
  const network = args.network || "atlantic-testnet";
  const rpcUrl = args["rpc-url"] || resolveRpcUrl(network);
  const depth = parseInt(args.depth || "2", 10);
  const lookback = parseInt(args.lookback || "50000", 10);
  const maxNodes = parseInt(args["max-nodes"] || "5000", 10);
  const maxEdges = parseInt(args["max-edges"] || "20000", 10);
  const outPath = args.out || "output/graph.json";

  if (network === "mainnet") {
    console.log("⚠️  MAINNET read — proceeding.");
  }

  const latest = await getBlockNumber(rpcUrl);
  const fromBlock = Math.max(0, latest - lookback);
  console.log(`[*] seed=${seed}  network=${network}  depth=${depth}  blocks=[${fromBlock}, ${latest}]`);

  const g = createGraph();
  g.meta = {
    seed: seed.toLowerCase(),
    network,
    blockRange: { from: fromBlock, to: latest },
    builtAt: new Date().toISOString(),
    depth,
  };
  ensureNode(g, seed, { timestamp: 0 });

  // BFS frontier
  let frontier = new Set([seed.toLowerCase()]);
  const visited = new Set([seed.toLowerCase()]);

  for (let d = 0; d <= depth; d++) {
    if (frontier.size === 0) break;
    if (Object.keys(g.nodes).length > maxNodes) {
      console.log(`[!] node cap hit (${maxNodes}); stopping BFS`);
      break;
    }
    if (g.edges.length > maxEdges) {
      console.log(`[!] edge cap hit (${maxEdges}); stopping BFS`);
      break;
    }

    console.log(`[*] hop ${d}: scanning ${frontier.size} wallets...`);

    // For each wallet in frontier, fetch Transfer events where it is `from` or `to`
    // topic0 = Transfer, topic1 = from, topic2 = to (indexed)
    // 32-byte addresses, padded
    let addedEdges = 0;
    for (const addr of frontier) {
      const padded = "0x" + addr.slice(2).toLowerCase().padStart(64, "0");
      for (const position of ["from", "to"]) {
        const topic = position === "from"
          ? [TRANSFER_TOPIC, padded, null]   // topic1 = from
          : [TRANSFER_TOPIC, null, padded];   // topic2 = to
        const filter = {
          fromBlock: "0x" + fromBlock.toString(16),
          toBlock: "0x" + latest.toString(16),
          topics: topic,
        };
        let pageCount = 0;
        try {
          for await (const logs of getLogsPaged(rpcUrl, filter, { pageSize: 5_000, sleepMs: 20 })) {
            pageCount++;
            for (const ev of logs) {
              const from = "0x" + ev.topics[1].slice(-40);
              const to = "0x" + ev.topics[2].slice(-40);
              const value = ev.data || "0x0";
              const blockNum = parseInt(ev.blockNumber, 16);
              addEdge(g, {
                from, to, token: ev.address, value, timestamp: blockNum,
                txHash: ev.transactionHash, logIndex: parseInt(ev.logIndex, 16),
              });
              addedEdges++;
              // expand frontier
              if (d < depth) {
                for (const next of [from, to]) {
                  const k = next.toLowerCase();
                  if (!visited.has(k)) {
                    visited.add(k);
                    // Add to a temp frontier
                    if (!g._nextFrontier) g._nextFrontier = new Set();
                    g._nextFrontier.add(k);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn(`[warn] scan failed for ${addr.slice(0, 10)}… (${position}): ${e.message}`);
        }
      }
    }

    frontier = g._nextFrontier || new Set();
    g._nextFrontier = undefined;
    console.log(`[*] hop ${d}: +${addedEdges} edges  total nodes=${Object.keys(g.nodes).length}  edges=${g.edges.length}`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(g, replacer, 2));
  console.log(`[ok] graph written to ${outPath}`);
  console.log(`     stats: ${JSON.stringify(graphStats(g))}`);
}

function replacer(_k, v) {
  if (typeof v === "bigint") return v.toString();
  return v;
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(2);
});
