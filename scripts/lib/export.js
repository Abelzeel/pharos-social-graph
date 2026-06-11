// pharos-social-graph / scripts/lib/export.js
// Export a graph to JSON, Mermaid, or DOT. Zero deps.

/**
 * Convert a graph to a Mermaid flowchart. Direction is "LR" by default.
 * Caps the number of nodes/edges to keep the diagram readable.
 */
export function toMermaid(g, opts = {}) {
  const { maxNodes = 30, maxEdges = 60, title } = opts;
  const nodes = Object.entries(g.nodes)
    .sort((a, b) => (b[1].txCount || 0) - (a[1].txCount || 0))
    .slice(0, maxNodes)
    .map(([k]) => k);
  const nodeSet = new Set(nodes);

  const edges = g.edges
    .filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, maxEdges);

  const lines = [];
  if (title) lines.push(`---`, `title: ${title}`, `---`);
  lines.push("flowchart LR");
  for (const n of nodes) {
    const label = shortLabel(n);
    lines.push(`  ${nodeId(n)}["${label}"]`);
  }
  for (const e of edges) {
    const weight = e.count || 1;
    lines.push(`  ${nodeId(e.from)} -->|${weight} tx| ${nodeId(e.to)}`);
  }
  return lines.join("\n");
}

export function toDOT(g, opts = {}) {
  const { maxNodes = 30, maxEdges = 60 } = opts;
  const nodes = Object.entries(g.nodes)
    .sort((a, b) => (b[1].txCount || 0) - (a[1].txCount || 0))
    .slice(0, maxNodes)
    .map(([k]) => k);
  const nodeSet = new Set(nodes);
  const edges = g.edges
    .filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, maxEdges);

  const lines = ["digraph G {"];
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=rounded, fontname="Helvetica"];');
  for (const n of nodes) {
    lines.push(`  "${n}" [label="${shortLabel(n)}"];`);
  }
  for (const e of edges) {
    const w = e.count || 1;
    lines.push(`  "${e.from}" -> "${e.to}" [label="${w} tx", penwidth=${Math.min(5, 1 + Math.log2(w))}];`);
  }
  lines.push("}");
  return lines.join("\n");
}

function nodeId(addr) {
  // Mermaid nodes can't start with digits; prefix + drop 0x
  return "n" + addr.slice(2, 10);
}

function shortLabel(addr) {
  if (!addr) return "?";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
