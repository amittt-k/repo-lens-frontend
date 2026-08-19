/**
 * Deterministic client-side graph flow tracing utility for RepoLens.
 *
 * Traverses verified graph relationships (CALLS, CALLS_API, HANDLES_ROUTE, USES, IMPORTS)
 * with cycle detection, deterministic branching resolution, and depth bounds.
 */

export interface FlowStep {
  nodeId: string;
  label: string;
  detail: string;
  relationshipType?: string | undefined;
  path?: string | undefined;
  kind?: string | undefined;
}

export interface TracedFlow {
  id: string;
  name: string;
  startNodeId: string;
  steps: FlowStep[];
  isLeaf: boolean;
}

export interface FlowGraphNode {
  id: string;
  label: string;
  path?: string | undefined;
  kind?: string | undefined;
  type?: string | undefined;
  data?: Record<string, any> | undefined;
  [key: string]: any;
}

export interface FlowGraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType?: string | undefined;
  relation?: string | undefined;
  [key: string]: any;
}

export interface FlowTraceOptions {
  maxDepth?: number | undefined;
}

const FLOW_RELATIONSHIPS = new Set([
  "CALLS",
  "CALLS_API",
  "HANDLES_ROUTE",
  "USES",
  "IMPORTS",
  // Lowercase compatibility
  "call",
  "import",
]);

function getRelationshipPriority(rel?: string): number {
  const norm = (rel || "").toUpperCase();
  if (norm === "CALLS_API" || norm === "HANDLES_ROUTE" || norm === "CALLS" || norm === "CALL") {
    return 1;
  }
  if (norm === "USES") {
    return 2;
  }
  if (norm === "IMPORTS" || norm === "IMPORT") {
    return 3;
  }
  return 4;
}

function formatStepDetail(relType: string, targetLabel: string): string {
  const norm = relType.toUpperCase();
  if (norm === "CALLS" || norm === "CALL") {
    return `Invokes ${targetLabel}`;
  }
  if (norm === "CALLS_API") {
    return `Calls endpoint ${targetLabel}`;
  }
  if (norm === "HANDLES_ROUTE") {
    return `Dispatches to route handler ${targetLabel}`;
  }
  if (norm === "USES") {
    return `Renders / utilizes ${targetLabel}`;
  }
  if (norm === "IMPORTS" || norm === "IMPORT") {
    return `Imports ${targetLabel}`;
  }
  return `Connected via ${norm} to ${targetLabel}`;
}

/**
 * Traces an execution / dependency flow starting from a specified node ID.
 *
 * @param startNodeId - Node identifier to begin traversal from
 * @param nodes - Array of repository graph nodes
 * @param edges - Array of repository graph edges
 * @param options - Traversal options (maxDepth defaults to 8)
 * @returns TracedFlow object with ordered steps
 */
export function traceFlowFromNode(
  startNodeId: string,
  nodes: FlowGraphNode[],
  edges: FlowGraphEdge[],
  options?: FlowTraceOptions,
): TracedFlow {
  const maxDepth = options?.maxDepth ?? 8;
  const nodeMap = new Map<string, FlowGraphNode>(nodes.map((n) => [n.id, n]));
  const startNode = nodeMap.get(startNodeId);

  if (!startNode) {
    return {
      id: `flow-${startNodeId}`,
      name: startNodeId,
      startNodeId,
      steps: [
        {
          nodeId: startNodeId,
          label: startNodeId,
          detail: "Selected entity (not found in current graph)",
        },
      ],
      isLeaf: true,
    };
  }

  // Index outgoing flow edges by source ID
  const outgoingMap = new Map<string, FlowGraphEdge[]>();
  for (const edge of edges) {
    const relType = edge.relationshipType || edge.relation || "";
    if (FLOW_RELATIONSHIPS.has(relType) || FLOW_RELATIONSHIPS.has(relType.toUpperCase())) {
      const list = outgoingMap.get(edge.source) || [];
      list.push(edge);
      outgoingMap.set(edge.source, list);
    }
  }

  const steps: FlowStep[] = [];
  const visited = new Set<string>();

  let currentId = startNodeId;
  visited.add(currentId);

  const startKind = (startNode.kind || startNode.type || "module").toLowerCase();
  const startPath = startNode.path || (startNode.data as any)?.filePath || "";

  steps.push({
    nodeId: startNode.id,
    label: startNode.label,
    detail: "Flow execution entry root",
    path: startPath,
    kind: startKind,
  });

  while (steps.length < maxDepth) {
    const candidateEdges = outgoingMap.get(currentId) || [];
    // Exclude targets that would cause a cycle
    const unvisitedEdges = candidateEdges.filter((e) => !visited.has(e.target));

    if (unvisitedEdges.length === 0) {
      // Reached a leaf node or cycle boundary
      break;
    }

    // Deterministic selection:
    // 1. Relationship Priority (CALLS/CALLS_API/HANDLES_ROUTE > USES > IMPORTS)
    // 2. Target node label alphabetical order
    // 3. Target node ID alphabetical order
    unvisitedEdges.sort((a, b) => {
      const pA = getRelationshipPriority(a.relationshipType || a.relation);
      const pB = getRelationshipPriority(b.relationshipType || b.relation);
      if (pA !== pB) return pA - pB;

      const labelA = nodeMap.get(a.target)?.label || a.target;
      const labelB = nodeMap.get(b.target)?.label || b.target;
      if (labelA !== labelB) return labelA.localeCompare(labelB);

      return a.target.localeCompare(b.target);
    });

    const chosenEdge = unvisitedEdges[0]!;
    const nextNode = nodeMap.get(chosenEdge.target);
    const nextLabel = nextNode?.label || chosenEdge.target;
    const nextKind = (nextNode?.kind || nextNode?.type || "module").toLowerCase();
    const nextPath = nextNode?.path || (nextNode?.data as any)?.filePath || "";
    const relUpper = (chosenEdge.relationshipType || chosenEdge.relation || "CALLS").toUpperCase();

    steps.push({
      nodeId: chosenEdge.target,
      label: nextLabel,
      detail: formatStepDetail(relUpper, nextLabel),
      relationshipType: relUpper,
      path: nextPath,
      kind: nextKind,
    });

    visited.add(chosenEdge.target);
    currentId = chosenEdge.target;
  }

  const isLeaf = steps.length === 1;
  const flowName = `Flow: ${startNode.label}${isLeaf ? " (Leaf)" : ` (${steps.length} steps)`}`;

  return {
    id: `flow-${startNodeId}`,
    name: flowName,
    startNodeId,
    steps,
    isLeaf,
  };
}

/**
 * Automatically discovers multi-step flows starting from repository entry points
 * (e.g. API routes, UI components, or root controllers).
 */
export function discoverRepositoryFlows(
  nodes: FlowGraphNode[],
  edges: FlowGraphEdge[],
  limit = 6,
): TracedFlow[] {
  if (!nodes.length || !edges.length) return [];

  // Calculate in-degrees for flow edges
  const inDegrees = new Map<string, number>();
  for (const node of nodes) {
    inDegrees.set(node.id, 0);
  }
  for (const edge of edges) {
    const rel = edge.relationshipType || edge.relation || "";
    if (FLOW_RELATIONSHIPS.has(rel) || FLOW_RELATIONSHIPS.has(rel.toUpperCase())) {
      inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);
    }
  }

  // Prioritize entry candidates: api_routes, 0-in-degree components/functions
  const candidates = [...nodes].filter((node) => {
    const kind = (node.kind || node.type || "").toLowerCase();
    const inDeg = inDegrees.get(node.id) || 0;
    return kind === "api_route" || inDeg === 0 || kind === "component";
  });

  const flows: TracedFlow[] = [];
  const seenStartIds = new Set<string>();

  for (const candidate of candidates) {
    if (seenStartIds.has(candidate.id)) continue;
    const flow = traceFlowFromNode(candidate.id, nodes, edges);
    if (flow.steps.length >= 2) {
      flows.push(flow);
      seenStartIds.add(candidate.id);
      if (flows.length >= limit) break;
    }
  }

  return flows;
}
