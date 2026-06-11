// pharos-social-graph / scripts/lib/graph.js
// Directed weighted multigraph for on-chain wallet relationships.
// Zero deps. JSON-serializable.

/**
 * Graph shape:
 * {
 *   nodes: { [address]: {
 *     address, label?, firstSeen, lastSeen,
 *     txCount, sentCount, receivedCount,
 *     inDegree, outDegree,
 *   } },
 *   edges: [ {
 *     from, to, token, value (raw bigint as string),
 *     count (number of txs aggregated), firstSeen, lastSeen
 *   } ],
 *   meta: { seed, network, blockRange, builtAt, txCount }
 * }
 */

export function createGraph() {
  return {
    nodes: Object.create(null),
    edges: [],
    meta: {},
  };
}

export function ensureNode(g, address, info = {}) {
  const k = address.toLowerCase();
  if (!g.nodes[k]) {
    g.nodes[k] = {
      address: k,
      firstSeen: info.timestamp ?? null,
      lastSeen: info.timestamp ?? null,
      txCount: 0,
      sentCount: 0,
      receivedCount: 0,
      inDegree: 0,
      outDegree: 0,
      totalSentRaw: "0",
      totalReceivedRaw: "0",
      counterparties: Object.create(null), // address -> count
    };
  } else if (info.timestamp != null) {
    if (g.nodes[k].firstSeen == null || info.timestamp < g.nodes[k].firstSeen)
      g.nodes[k].firstSeen = info.timestamp;
    if (g.nodes[k].lastSeen == null || info.timestamp > g.nodes[k].lastSeen)
      g.nodes[k].lastSeen = info.timestamp;
  }
  return g.nodes[k];
}

/**
 * Add a Transfer edge. Aggregates by (from,to,token).
 */
export function addEdge(g, { from, to, token, value, timestamp, txHash, logIndex }) {
  if (!from || !to) return;
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === t) return; // skip self-transfers

  ensureNode(g, f, { timestamp });
  ensureNode(g, t, { timestamp });

  g.nodes[f].txCount++;
  g.nodes[f].sentCount++;
  g.nodes[f].outDegree++;
  g.nodes[f].counterparties[t] = (g.nodes[f].counterparties[t] || 0) + 1;

  g.nodes[t].txCount++;
  g.nodes[t].receivedCount++;
  g.nodes[t].inDegree++;
  g.nodes[t].counterparties[f] = (g.nodes[t].counterparties[f] || 0) + 1;

  g.nodes[f].totalSentRaw = addBigStr(g.nodes[f].totalSentRaw, value);
  g.nodes[t].totalReceivedRaw = addBigStr(g.nodes[t].totalReceivedRaw, value);

  // Find existing edge for (f, t, token) — aggregate
  const key = `${f}|${t}|${token.toLowerCase()}`;
  let e = g.edges.find(
    (e) => e.from === f && e.to === t && e.token === token.toLowerCase()
  );
  if (!e) {
    e = {
      from: f,
      to: t,
      token: token.toLowerCase(),
      totalValueRaw: "0",
      count: 0,
      firstSeen: timestamp,
      lastSeen: timestamp,
      sampleTxs: [],
    };
    g.edges.push(e);
  }
  e.totalValueRaw = addBigStr(e.totalValueRaw, value);
  e.count++;
  if (timestamp != null) {
    if (e.firstSeen == null || timestamp < e.firstSeen) e.firstSeen = timestamp;
    if (e.lastSeen == null || timestamp > e.lastSeen) e.lastSeen = timestamp;
  }
  if (e.sampleTxs.length < 5 && txHash) {
    e.sampleTxs.push({ tx: txHash, logIndex, value, timestamp });
  }
}

function addBigStr(a, b) {
  try {
    const A = BigInt(a);
    const B = BigInt(b);
    return (A + B).toString();
  } catch {
    return "0";
  }
}

/** Filter the graph to a seed + N hops. Returns a new Graph. */
export function egoGraph(g, seed, depth = 2) {
  const seedK = seed.toLowerCase();
  if (!g.nodes[seedK]) return createGraph();

  const keep = new Set([seedK]);
  let frontier = new Set([seedK]);
  for (let d = 0; d < depth; d++) {
    const next = new Set();
    for (const node of frontier) {
      // outgoing
      for (const e of g.edges) {
        if (e.from === node && !keep.has(e.to)) next.add(e.to);
        if (e.to === node && !keep.has(e.from)) next.add(e.from);
      }
    }
    for (const n of next) keep.add(n);
    frontier = next;
  }

  return subgraph(g, keep);
}

/** Build a new graph containing only nodes in `keep` and edges between them. */
export function subgraph(g, keep) {
  const out = createGraph();
  out.meta = { ...g.meta, ego: true, keepCount: keep.size };
  for (const k of keep) {
    if (g.nodes[k]) out.nodes[k] = { ...g.nodes[k] };
  }
  for (const e of g.edges) {
    if (keep.has(e.from) && keep.has(e.to)) {
      out.edges.push({ ...e });
    }
  }
  return out;
}

/** Top-N nodes by some counterparty count. */
export function topCounterparties(g, addr, n = 10) {
  const node = g.nodes[addr.toLowerCase()];
  if (!node) return [];
  return Object.entries(node.counterparties)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([address, count]) => ({
      address,
      txCount: count,
      node: g.nodes[address],
    }));
}

export function graphStats(g) {
  return {
    nodeCount: Object.keys(g.nodes).length,
    edgeCount: g.edges.length,
    selfLoopsFiltered: true,
    seed: g.meta.seed,
    network: g.meta.network,
    blockRange: g.meta.blockRange,
    builtAt: g.meta.builtAt,
  };
}
