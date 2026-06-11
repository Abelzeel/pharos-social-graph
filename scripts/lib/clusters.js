// pharos-social-graph / scripts/lib/clusters.js
// Connected components + Louvain-lite community detection.
// Zero deps. Treats the graph as undirected for clustering.

/**
 * Find connected components (treats the graph as undirected).
 * @returns {Array<{ id, size, members, internalEdgeCount }>}
 */
export function connectedComponents(g) {
  const visited = new Set();
  const components = [];

  // Build undirected adjacency
  const adj = Object.create(null);
  for (const n of Object.keys(g.nodes)) adj[n] = new Set();
  for (const e of g.edges) {
    adj[e.from].add(e.to);
    adj[e.to].add(e.from);
  }

  for (const n of Object.keys(g.nodes)) {
    if (visited.has(n)) continue;
    const component = [];
    const stack = [n];
    visited.add(n);
    while (stack.length) {
      const cur = stack.pop();
      component.push(cur);
      for (const m of adj[cur]) {
        if (!visited.has(m)) {
          visited.add(m);
          stack.push(m);
        }
      }
    }
    let internalEdgeCount = 0;
    for (const m of component) {
      for (const e of g.edges) {
        if ((e.from === m && component.includes(e.to)) ||
            (e.to === m && component.includes(e.from))) {
          internalEdgeCount++;
        }
      }
    }
    components.push({
      id: components.length + 1,
      size: component.length,
      members: component,
      internalEdgeCount,
    });
  }

  return components.sort((a, b) => b.size - a.size);
}

/**
 * Lightweight Louvain-style community detection.
 * Greedy modularity-maximization with a single pass.
 *
 * @returns {Array<{ id, size, members, modularityContribution }>}
 */
export function detectCommunities(g) {
  // Initialize: each node is its own community
  const nodeComm = Object.create(null);
  for (const n of Object.keys(g.nodes)) nodeComm[n] = n;

  // Build edge weight map (undirected, sum of weights)
  const w = new Map(); // "from|to" key (sorted) -> weight
  for (const e of g.edges) {
    const a = e.from, b = e.to;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    w.set(key, (w.get(key) || 0) + e.count);
  }
  const totalWeight = (() => {
    let s = 0;
    for (const v of w.values()) s += v;
    return s || 1;
  })();

  // Per-node degree sum (undirected)
  const k = Object.create(null);
  for (const n of Object.keys(g.nodes)) k[n] = 0;
  for (const [key, weight] of w.entries()) {
    const [a, b] = key.split("|");
    k[a] += weight;
    k[b] += weight;
  }

  // Iterative improvement
  let improved = true;
  let iter = 0;
  while (improved && iter < 10) {
    improved = false;
    iter++;
    for (const n of Object.keys(g.nodes)) {
      // Compute neighbor communities + their total weight
      const neighborCommWeight = new Map(); // comm -> weight from n to that comm
      for (const [key, weight] of w.entries()) {
        const [a, b] = key.split("|");
        if (a === n) {
          const c = nodeComm[b];
          neighborCommWeight.set(c, (neighborCommWeight.get(c) || 0) + weight);
        } else if (b === n) {
          const c = nodeComm[a];
          neighborCommWeight.set(c, (neighborCommWeight.get(c) || 0) + weight);
        }
      }
      // Find best community to join
      let bestComm = nodeComm[n];
      let bestDelta = 0;
      for (const [c, w_to] of neighborCommWeight) {
        if (c === nodeComm[n]) continue;
        // ΔQ when moving n from its current community to c:
        //   (w_to / m) - (k_n * sum_c / (2 m^2))
        // where sum_c = sum of degrees in c
        const sumC = sumDegreesInComm(nodeComm, k, c);
        const delta = (w_to / totalWeight) - (k[n] * sumC) / (2 * totalWeight * totalWeight);
        if (delta > bestDelta) {
          bestDelta = delta;
          bestComm = c;
        }
      }
      if (bestComm !== nodeComm[n]) {
        nodeComm[n] = bestComm;
        improved = true;
      }
    }
  }

  // Aggregate results
  const commMap = new Map();
  for (const [n, c] of Object.entries(nodeComm)) {
    if (!commMap.has(c)) commMap.set(c, []);
    commMap.get(c).push(n);
  }
  return [...commMap.values()]
    .map((members, i) => ({
      id: i + 1,
      size: members.length,
      members,
    }))
    .sort((a, b) => b.size - a.size);
}

function sumDegreesInComm(nodeComm, k, c) {
  let s = 0;
  for (const [n, comm] of Object.entries(nodeComm)) {
    if (comm === c) s += k[n];
  }
  return s;
}
