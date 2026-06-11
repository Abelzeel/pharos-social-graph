// pharos-social-graph / scripts/lib/pagerank.js
// PageRank over a directed weighted graph. Power-iteration method.
// Zero deps.

/**
 * @param {ReturnType<typeof import('./graph.js').createGraph>} g
 * @param {{ damping?: number, iterations?: number, tolerance?: number }} opts
 * @returns {Array<{ address, score, rank }>}
 */
export function pageRank(g, opts = {}) {
  const { damping = 0.85, iterations = 50, tolerance = 1e-6 } = opts;
  const nodes = Object.keys(g.nodes);
  const N = nodes.length;
  if (N === 0) return [];

  // Build adjacency: out-edges per node
  const outSum = Object.create(null); // total out-weight per node
  const outgoing = Object.create(null); // node -> [{to, weight}]
  for (const n of nodes) {
    outSum[n] = 0;
    outgoing[n] = [];
  }
  for (const e of g.edges) {
    const w = Number(BigInt(e.count) || 1n);
    outgoing[e.from].push({ to: e.to, weight: w });
    outSum[e.from] += w;
  }

  // Initial rank = 1/N
  let rank = Object.create(null);
  for (const n of nodes) rank[n] = 1 / N;

  for (let iter = 0; iter < iterations; iter++) {
    const next = Object.create(null);
    let danglingSum = 0;
    for (const n of nodes) {
      if (outSum[n] === 0) {
        // Dangling node: distribute rank evenly
        danglingSum += rank[n];
      }
    }
    const danglingShare = (damping * danglingSum) / N;

    for (const n of nodes) {
      let s = (1 - damping) / N + danglingShare;
      // Sum of contributions from incoming edges
      for (const m of nodes) {
        const edges = outgoing[m];
        if (edges.length === 0 || outSum[m] === 0) continue;
        for (const { to, weight } of edges) {
          if (to === n) s += damping * (rank[m] * weight) / outSum[m];
        }
      }
      next[n] = s;
    }

    // Check convergence
    let diff = 0;
    for (const n of nodes) diff += Math.abs(next[n] - rank[n]);
    rank = next;
    if (diff < tolerance) break;
  }

  // Sort & assign ranks
  return Object.entries(rank)
    .map(([address, score]) => ({ address, score }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
