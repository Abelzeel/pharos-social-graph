// pharos-social-graph / scripts/lib/paths.js
// BFS shortest path in a directed weighted graph. Zero deps.

/**
 * BFS shortest path (unweighted by hops, but counts edge weight as a
 * "path strength" — sum of edge counts).
 *
 * @param {ReturnType<typeof import('./graph.js').createGraph>} g
 * @param {string} from
 * @param {string} to
 * @param {{ maxHops?: number, maxPaths?: number }} opts
 * @returns {{ path: string[]|null, edges: any[]|null, hopCount: number, totalWeight: number }}
 */
export function shortestPath(g, from, to, opts = {}) {
  const { maxHops = 6 } = opts;
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  if (a === b) return { path: [a], edges: [], hopCount: 0, totalWeight: 0 };
  if (!g.nodes[a] || !g.nodes[b]) return { path: null, edges: null, hopCount: -1, totalWeight: 0 };

  // Build adjacency with edge metadata
  const adj = Object.create(null);
  for (const n of Object.keys(g.nodes)) adj[n] = [];
  for (const e of g.edges) {
    adj[e.from].push({ to: e.to, edge: e });
  }

  const visited = new Set([a]);
  const queue = [{ node: a, path: [a], edges: [], hops: 0, weight: 0 }];

  while (queue.length) {
    const { node, path, edges, hops, weight } = queue.shift();
    if (hops >= maxHops) continue;
    for (const { to: next, edge } of adj[node] || []) {
      if (visited.has(next)) continue;
      const newPath = [...path, next];
      const newEdges = [...edges, edge];
      const newWeight = weight + (edge.count || 1);
      if (next === b) {
        return { path: newPath, edges: newEdges, hopCount: newEdges.length, totalWeight: newWeight };
      }
      visited.add(next);
      queue.push({ node: next, path: newPath, edges: newEdges, hops: hops + 1, weight: newWeight });
    }
  }

  return { path: null, edges: null, hopCount: -1, totalWeight: 0 };
}
