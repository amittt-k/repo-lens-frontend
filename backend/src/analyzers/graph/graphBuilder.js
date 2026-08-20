/**
 * RepoLens — Graph Builder / Data Transformer
 *
 * Converts persisted repository entities (Repository, File, Symbol, Relationship, ApiRoute)
 * into a normalized, deterministic graph representation suitable for graph analysis and visualization.
 */

/**
 * Normalizes a path string to forward slashes without leading or trailing slashes.
 *
 * @param {string} p - Path string.
 * @returns {string}
 */
export function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * Maps a symbol kind or type to a normalized node type.
 * @param {string} kindOrType
 * @returns {string}
 */
export function normalizeSymbolNodeType(kindOrType) {
  if (!kindOrType) return "symbol";
  const lower = String(kindOrType).toLowerCase();
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
  const symbolLookupByCompositeKey = new Map();
  const routeLookupByIdOrKey = new Map();

  // 1. Index files and create File nodes
  for (const f of files) {
    if (!f || !f.id) continue;
    fileLookupById.set(f.id, f);
    if (f.path) {
      fileLookupByPath.set(f.path, f);
      fileLookupByPath.set(normalizePath(f.path), f);
    }

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
    const parentPath = parentFile ? parentFile.path : "";
    const symTypeOrKind = s.type || s.kind;
    const nodeType = normalizeSymbolNodeType(symTypeOrKind);

    const symbolNode = {
      id: s.id,
      label: s.name,
      type: nodeType,
      data: {
        name: s.name,
        kind: symTypeOrKind || "symbol",
        type: symTypeOrKind || "symbol",
        fileId: s.fileId,
        filePath: parentPath,
        isExported: s.isExported ?? false,
        startLine: s.startLine || 1,
        endLine: s.endLine || 1,
        metadata: s.metadata || {},
      },
    };
    nodeMap.set(symbolNode.id, symbolNode);

    // Build secondary composite lookup indices for cross-stage relationship matching
    if (s.name) {
      const typeUpper = (symTypeOrKind || "").toUpperCase();

      if (parentPath) {
        const normParent = normalizePath(parentPath);
        if (typeUpper) {
          symbolLookupByCompositeKey.set(`${normParent}::${s.name}::${typeUpper}`, symbolNode);
        }
        if (!symbolLookupByCompositeKey.has(`${normParent}::${s.name}`)) {
          symbolLookupByCompositeKey.set(`${normParent}::${s.name}`, symbolNode);
        }
      }

      if (s.fileId) {
        if (typeUpper) {
          symbolLookupByCompositeKey.set(`${s.fileId}::${s.name}::${typeUpper}`, symbolNode);
        }
        if (!symbolLookupByCompositeKey.has(`${s.fileId}::${s.name}`)) {
          symbolLookupByCompositeKey.set(`${s.fileId}::${s.name}`, symbolNode);
        }
      }
    }
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
    routeLookupByIdOrKey.set(r.id, routeNode);
    if (r.method && r.path) {
      routeLookupByIdOrKey.set(`${r.method.toUpperCase()} ${r.path}`, routeNode);
    }
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

    // Fallback 1: File path lookup for file nodes
    if (!sourceNode) {
      const matchedFile = fileLookupByPath.get(rel.sourceId) || fileLookupByPath.get(normalizePath(rel.sourceId));
      if (matchedFile) sourceNode = nodeMap.get(matchedFile.id);
    }
    if (!targetNode) {
      const matchedFile = fileLookupByPath.get(rel.targetId) || fileLookupByPath.get(normalizePath(rel.targetId));
      if (matchedFile) targetNode = nodeMap.get(matchedFile.id);
    }

    // Fallback 2: Composite key lookup for symbol nodes
    if (!sourceNode && symbolLookupByCompositeKey.has(rel.sourceId)) {
      sourceNode = symbolLookupByCompositeKey.get(rel.sourceId);
    }
    if (!targetNode && symbolLookupByCompositeKey.has(rel.targetId)) {
      targetNode = symbolLookupByCompositeKey.get(rel.targetId);
    }

    // Fallback 3: API route lookup
    if (!sourceNode && routeLookupByIdOrKey.has(rel.sourceId)) {
      sourceNode = routeLookupByIdOrKey.get(rel.sourceId);
    }
    if (!targetNode && routeLookupByIdOrKey.has(rel.targetId)) {
      targetNode = routeLookupByIdOrKey.get(rel.targetId);
    }

    // Fallback 4: External package dependency node generation
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

