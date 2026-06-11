#!/usr/bin/env node
// pharos-social-graph / tests/test-graph.js
// Lightweight invariant tests. Run with: npm test
// Or: node tests/test-graph.js

import { strict as assert } from "node:assert";
import { createGraph, addEdge, ensureNode, egoGraph, topCounterparties, graphStats } from "../scripts/lib/graph.js";
import { pageRank } from "../scripts/lib/pagerank.js";
import { connectedComponents, detectCommunities } from "../scripts/lib/clusters.js";
import { shortestPath } from "../scripts/lib/paths.js";
import { toMermaid, toDOT } from "../scripts/lib/export.js";

let pass = 0, fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

console.log("graph.js");
test("createGraph returns empty", () => {
  const g = createGraph();
  assert.equal(Object.keys(g.nodes).length, 0);
  assert.equal(g.edges.length, 0);
});

test("addEdge increments node stats", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "100", timestamp: 1 });
  assert.equal(g.nodes["0xa"].sentCount, 1);
  assert.equal(g.nodes["0xb"].receivedCount, 1);
  assert.equal(g.nodes["0xa"].outDegree, 1);
  assert.equal(g.nodes["0xb"].inDegree, 1);
  assert.equal(g.edges.length, 1);
});

test("addEdge aggregates by (from, to, token)", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "100" });
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "50" });
  assert.equal(g.edges.length, 1);
  assert.equal(g.edges[0].count, 2);
  assert.equal(g.edges[0].totalValueRaw, "150");
});

test("addEdge skips self-transfer", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xA", token: "0xT", value: "100" });
  assert.equal(g.edges.length, 0);
});

test("egoGraph returns seed + 1-hop", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xB", to: "0xC", token: "0xT", value: "1" });
  addEdge(g, { from: "0xX", to: "0xY", token: "0xT", value: "1" });
  const ego = egoGraph(g, "0xA", 1);
  assert.equal(Object.keys(ego.nodes).length, 2);
  assert.equal(ego.edges.length, 1);
});

test("egoGraph depth 2 includes grandchildren", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xB", to: "0xC", token: "0xT", value: "1" });
  const ego = egoGraph(g, "0xA", 2);
  assert.equal(Object.keys(ego.nodes).length, 3);
});

console.log("\npagerank.js");
test("pageRank returns sorted list", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xA", to: "0xC", token: "0xT", value: "1" });
  addEdge(g, { from: "0xB", to: "0xC", token: "0xT", value: "1" });
  const pr = pageRank(g, { iterations: 50 });
  assert.equal(pr.length, 3);
  // C has the most inbound, should rank #1
  assert.equal(pr[0].address, "0xc");
  // Scores sum to ~1
  const sum = pr.reduce((a, r) => a + r.score, 0);
  assert.ok(Math.abs(sum - 1) < 0.01, `sum=${sum}`);
});

test("pageRank on empty graph", () => {
  const g = createGraph();
  const pr = pageRank(g);
  assert.equal(pr.length, 0);
});

console.log("\nclusters.js");
test("connectedComponents finds 2 components", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xC", to: "0xD", token: "0xT", value: "1" });
  const comps = connectedComponents(g);
  assert.equal(comps.length, 2);
});

test("detectCommunities groups connected", () => {
  const g = createGraph();
  // Triangle: 0xa - 0xb - 0xc - 0xa
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xB", to: "0xC", token: "0xT", value: "1" });
  addEdge(g, { from: "0xC", to: "0xA", token: "0xT", value: "1" });
  // Isolated edge: 0xd - 0xe
  addEdge(g, { from: "0xD", to: "0xE", token: "0xT", value: "1" });
  const comms = detectCommunities(g);
  assert.ok(comms.length >= 2, `expected ≥2 communities, got ${comms.length}`);
});

console.log("\npaths.js");
test("shortestPath finds 1-hop", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  const r = shortestPath(g, "0xA", "0xB");
  assert.equal(r.hopCount, 1);
  assert.deepEqual(r.path, ["0xa", "0xb"]);
});

test("shortestPath finds 2-hop", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xB", to: "0xC", token: "0xT", value: "1" });
  const r = shortestPath(g, "0xA", "0xC");
  assert.equal(r.hopCount, 2);
  assert.equal(r.path.length, 3);
});

test("shortestPath returns null when disconnected", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  addEdge(g, { from: "0xC", to: "0xD", token: "0xT", value: "1" });
  const r = shortestPath(g, "0xA", "0xC");
  assert.equal(r.path, null);
});

console.log("\nexport.js");
test("toMermaid produces valid syntax", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  const mmd = toMermaid(g);
  assert.ok(mmd.startsWith("flowchart LR"));
  assert.ok(mmd.includes("-->"));
});

test("toDOT produces valid syntax", () => {
  const g = createGraph();
  addEdge(g, { from: "0xA", to: "0xB", token: "0xT", value: "1" });
  const dot = toDOT(g);
  assert.ok(dot.startsWith("digraph G {"));
  assert.ok(dot.includes("->"));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
