/**
 * RepoLens — Graph Builder / Data Transformer
 *
 * Converts persisted repository entities (Repository, File, Symbol, Relationship, ApiRoute)
 * into a normalized, deterministic graph representation suitable for graph analysis and visualization.
 */

/**
 * Maps a symbol kind to a normalized node type.
 * @param {string} kind
 * @returns {string}
 */
export function normalizeSymbolNodeType(kind) {
  if (!kind) return "symbol";
  const lower = kind.toLowerCase();
  if (lower === "function") return "function";
  if (lower === "class") return "class";
  if (lower === "method") return "method";
  if (lower === "component") return "component";
  if (lower === "interface" || lower === "type") return "type";
  if (lower === "variable" || lower === "constant") return "variable";
  return "symbol";
}

/**
 * Builds normalized graph nodes and edges from repository analysis data.
 *
 * @param {object} params
 * @param {object} params.repository - Repository record
 * @param {Array<object>} [params.files=[]] - File records
 * @param {Array<object>} [params.symbols=[]] - Symbol records
 * @param {Array<object>} [params.relationships=[]] - Relationship records
 * @param {Array<object>} [params.apiRoutes=[]] - ApiRoute records
 * @param {object} [params.options={}] - Filter and transformation options
 * @returns {{ nodes: Array<object>, edges: Array<object>, stats: object }}
 */
export function buildGraph({
  repository = null,
  files = [],
  symbols = [],
  relationships = [],
  apiRoutes = [],
  options = {},
}) {
  const nodeMap = new Map();
  const fileLookupById = new Map();
  const fileLookupByPath = new Map();

  // 1. Index files and create File nodes
  for (const f of files) {
    if (!f || !f.id) continue;
    fileLookupById.set(f.id, f);
    if (f.path) fileLookupByPath.set(f.path, f);

    const fileNode = {
      id: f.id,
      label: f.name || f.path.split("/").pop() || f.path,
      type: "file",
      data: {
        name: f.name || f.path.split("/").pop() || f.path,
        filePath: f.path,
        extension: f.extension || "",
        isSupported: f.isSupportedSource ?? true,
        size: f.size || 0,
        loc: f.loc || 0,
      },
    };
    nodeMap.set(fileNode.id, fileNode);
  }

  // 2. Index symbols and create Symbol nodes
  for (const s of symbols) {
    if (!s || !s.id) continue;
    const parentFile = fileLookupById.get(s.fileId);
    const nodeType = normalizeSymbolNodeType(s.kind);

    const symbolNode = {
      id: s.id,
      label: s.name,
      type: nodeType,
      data: {
        name: s.name,
        kind: s.kind,
        fileId: s.fileId,
        filePath: parentFile ? parentFile.path : "",
        isExported: s.isExported ?? false,
        startLine: s.startLine || 1,
        endLine: s.endLine || 1,
        metadata: s.metadata || {},
      },
    };
    nodeMap.set(symbolNode.id, symbolNode);
  }

  // 3. Index API routes and create ApiRoute nodes
  for (const r of apiRoutes) {
    if (!r || !r.id) continue;
    const parentFile = fileLookupById.get(r.fileId);

    const routeNode = {
      id: r.id,
      label: `${r.method} ${r.path}`,
      type: "api_route",
      data: {
        method: r.method,
        path: r.path,
        handler: r.handler || null,
        fileId: r.fileId || null,
        filePath: parentFile ? parentFile.path : "",
      },
    };
    nodeMap.set(routeNode.id, routeNode);
  }

  // 4. Process relationships and build deterministic edges
  const edgeMap = new Map();
  const allowedRelTypes = options.relationshipTypes
    ? new Set(options.relationshipTypes.map((t) => t.toUpperCase()))
    : null;
  const allowedNodeTypes = options.nodeTypes
    ? new Set(options.nodeTypes.map((t) => t.toLowerCase()))
    : null;

  for (const rel of relationships) {
    if (!rel || !rel.sourceId || !rel.targetId || !rel.relationshipType) continue;
    const relType = rel.relationshipType.toUpperCase();

    // Relationship type filter
    if (allowedRelTypes && !allowedRelTypes.has(relType)) continue;

    let sourceNode = nodeMap.get(rel.sourceId);
    let targetNode = nodeMap.get(rel.targetId);

    // Check if sourceId or targetId is a file path instead of UUID
    if (!sourceNode && fileLookupByPath.has(rel.sourceId)) {
      sourceNode = nodeMap.get(fileLookupByPath.get(rel.sourceId).id);
    }
    if (!targetNode && fileLookupByPath.has(rel.targetId)) {
      targetNode = nodeMap.get(fileLookupByPath.get(rel.targetId).id);
    }

    // External package dependency node generation
    if (!targetNode && (rel.targetId.startsWith("package:") || rel.metadata?.isExternal || rel.metadata?.packageName)) {
      const pkgName = rel.metadata?.packageName || rel.targetId.replace(/^package:/, "");
      const pkgNodeId = `package:${pkgName}`;

      if (!nodeMap.has(pkgNodeId)) {
        nodeMap.set(pkgNodeId, {
          id: pkgNodeId,
          label: pkgName,
          type: "package",
          data: {
            packageName: pkgName,
            isExternal: true,
          },
        });
      }
      targetNode = nodeMap.get(pkgNodeId);
    }

    // Skip edge if source or target cannot be resolved to a valid graph node
    if (!sourceNode || !targetNode) continue;

    const sourceId = sourceNode.id;
    const targetId = targetNode.id;
    const edgeKey = `${sourceId}::${relType}::${targetId}`;

    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, {
        id: rel.id || `edge-${sourceId}-${relType}-${targetId}`,
        source: sourceId,
        target: targetId,
        relationshipType: relType,
        data: rel.metadata || {},
      });
    }
  }

  let nodes = Array.from(nodeMap.values());
  let edges = Array.from(edgeMap.values());

  // 5. Apply node type filtering if specified
  if (allowedNodeTypes) {
    const validNodeIdSet = new Set();
    nodes = nodes.filter((n) => {
      const keep = allowedNodeTypes.has(n.type.toLowerCase());
      if (keep) validNodeIdSet.add(n.id);
      return keep;
    });

    // Keep only edges where both source and target nodes are kept
    edges = edges.filter((e) => validNodeIdSet.has(e.source) && validNodeIdSet.has(e.target));
  }

  // 6. Selected node neighborhood / connection filtering if specified
  if (options.nodeId) {
    const targetId = options.nodeId;
    const connectedNodeIds = new Set([targetId]);

    // Find all 1-hop connected edges
    const connectedEdges = edges.filter((e) => {
      if (e.source === targetId) {
        connectedNodeIds.add(e.target);
        return true;
      }
      if (e.target === targetId) {
        connectedNodeIds.add(e.source);
        return true;
      }
      return false;
    });

    nodes = nodes.filter((n) => connectedNodeIds.has(n.id));
    edges = connectedEdges;
  }

  // 7. Calculate graph statistics
  const nodesByType = {};
  for (const n of nodes) {
    nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
  }

  const edgesByType = {};
  for (const e of edges) {
    edgesByType[e.relationshipType] = (edgesByType[e.relationshipType] || 0) + 1;
  }

  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    edgesByType,
  };

  return {
    nodes,
    edges,
    stats,
  };
}
