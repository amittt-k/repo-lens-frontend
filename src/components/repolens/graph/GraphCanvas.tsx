import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GraphEdgeData, GraphNodeData } from "@/data/mock-repo";
import { getRelationTokens } from "@/lib/graph-tokens";
import { GraphToolbar } from "../GraphToolbar";
import { CodeNode, type CodeNodePayload } from "./CodeNode";

const nodeTypes = { code: CodeNode };

export interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  traceNodeIds?: string[];
  traceActive?: boolean;
  onTraceToggle?: (next: boolean) => void;
  onOpenSearch: () => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
  onOpenSidebar?: (() => void) | undefined;
}

function computeConnectedNeighbors(
  selectedId: string | null,
  edges: GraphEdgeData[],
): Set<string> {
  const neighbors = new Set<string>();
  if (!selectedId) return neighbors;

  neighbors.add(selectedId);
  for (const edge of edges) {
    if (edge.source === selectedId) {
      neighbors.add(edge.target);
    } else if (edge.target === selectedId) {
      neighbors.add(edge.source);
    }
  }
  return neighbors;
}

function mapNodes(
  sourceNodes: GraphNodeData[],
  seed: number,
  selectedId: string | null,
  connectedIds: Set<string>,
  traceIds: string[] = [],
  isTraceActive = false,
  prevNodes?: Node[],
): Node[] {
  const prevNodeMap = new Map(prevNodes?.map((n) => [n.id, n]));
  const traceIdSet = new Set(traceIds);
  const hasSelection = Boolean(selectedId);
  const cols = 5;

  return sourceNodes.map((n, i) => {
    const prevNode = prevNodeMap.get(n.id);
    const defaultPos =
      seed === 0
        ? n.position
        : { x: (i % cols) * 300 + 40, y: Math.floor(i / cols) * 170 + 40 };

    const position = prevNode?.position ?? defaultPos;
    const isSelected = selectedId === n.id;
    const isNeighbor = connectedIds.has(n.id);
    const inTrace = traceIdSet.has(n.id);
    const inHighlight = isNeighbor && !isSelected;
    const dimmed = hasSelection
      ? !isSelected && !isNeighbor
      : isTraceActive && traceIds.length > 0 && !inTrace;

    // Reuse prevNode if all visual and data properties are identical
    if (prevNode && prevNode.data) {
      const prevData = prevNode.data as CodeNodePayload;
      if (
        prevNode.selected === isSelected &&
        prevNode.position.x === position.x &&
        prevNode.position.y === position.y &&
        prevData.inTrace === inTrace &&
        prevData.inHighlight === inHighlight &&
        prevData.dimmed === dimmed &&
        prevData.label === n.label &&
        prevData.path === n.path &&
        prevData.kind === n.kind &&
        prevData.loc === n.loc
      ) {
        return prevNode;
      }
    }

    return {
      id: n.id,
      type: "code",
      position,
      selected: isSelected,
      data: {
        label: n.label,
        path: n.path,
        kind: n.kind,
        loc: n.loc,
        inTrace,
        inHighlight,
        dimmed,
      } satisfies CodeNodePayload,
    } satisfies Node;
  });
}

function isEdgeInTrace(edge: GraphEdgeData, traceIds: string[]): boolean {
  if (traceIds.length < 2) return false;
  for (let i = 0; i < traceIds.length - 1; i++) {
    if (traceIds[i] === edge.source && traceIds[i + 1] === edge.target) {
      return true;
    }
  }
  return false;
}

function mapEdges(
  sourceEdges: GraphEdgeData[],
  selectedId: string | null,
  traceIds: string[] = [],
  isTraceActive = false,
  prevEdges?: Edge[],
): Edge[] {
  const prevEdgeMap = new Map(prevEdges?.map((e) => [e.id, e]));
  const hasSelection = Boolean(selectedId);

  return sourceEdges.map((e) => {
    const prevEdge = prevEdgeMap.get(e.id);
    const isOutgoing = hasSelection && e.source === selectedId;
    const isIncoming = hasSelection && e.target === selectedId;
    const isConnected = isOutgoing || isIncoming;
    const inTrace = isTraceActive && isEdgeInTrace(e, traceIds);
    const dimmed = isTraceActive && traceIds.length > 0 ? !inTrace : hasSelection && !isConnected;
    const relTokens = getRelationTokens(e.relation || e.symbol);

    const animated = inTrace || isConnected;
    // Outgoing dependencies styled with primary vibrant stroke; incoming dependents styled with vibrant emerald stroke
    const stroke = inTrace
      ? "var(--color-primary)"
      : isOutgoing
        ? "var(--color-primary)"
        : isIncoming
          ? "oklch(0.78 0.18 150)"
          : relTokens.cssVar;

    const strokeWidth = inTrace ? 3 : isConnected ? 2.6 : 1.8;
    const opacity = dimmed ? 0.08 : inTrace ? 1 : isConnected ? 1 : 0.85;
    const labelBgOpacity = dimmed ? 0 : 0.9;
    const markerSize = isConnected || inTrace ? 15 : 12;

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: relTokens.label,
      animated,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: markerSize,
        height: markerSize,
        color: stroke,
      },
      style: {
        stroke,
        strokeWidth,
        opacity,
        strokeDasharray: relTokens.dash,
      },
      labelStyle: {
        fill: "var(--color-muted-foreground)",
        fontSize: 9,
        fontFamily: "var(--font-mono)",
      },
      labelBgStyle: {
        fill: "var(--color-background)",
        opacity: labelBgOpacity,
      },
    } satisfies Edge;
  });
}


function Canvas(props: GraphCanvasProps) {
  const { zoomIn, zoomOut, fitView, setCenter, getNode } = useReactFlow();
  const [layoutSeed, setLayoutSeed] = useState(0);
  const lastSelectedIdRef = useRef<string | null>(null);

  const connectedNeighborIds = useMemo(
    () => computeConnectedNeighbors(props.selectedId, props.edges),
    [props.selectedId, props.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    mapNodes(
      props.nodes,
      0,
      props.selectedId,
      connectedNeighborIds,
      props.traceNodeIds,
      props.traceActive,
    ),
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    mapEdges(props.edges, props.selectedId, props.traceNodeIds, props.traceActive),
  );

  // Sync nodes when inputs change, preserving dragged positions and unchanged node objects
  useEffect(() => {
    setNodes((prev) =>
      mapNodes(
        props.nodes,
        layoutSeed,
        props.selectedId,
        connectedNeighborIds,
        props.traceNodeIds,
        props.traceActive,
        prev,
      ),
    );
  }, [
    props.nodes,
    props.selectedId,
    connectedNeighborIds,
    props.traceNodeIds,
    props.traceActive,
    layoutSeed,
    setNodes,
  ]);

  // Sync edges when edges or selection/trace state changes, reusing unchanged edge objects
  useEffect(() => {
    setEdges((prev) =>
      mapEdges(props.edges, props.selectedId, props.traceNodeIds, props.traceActive, prev),
    );
  }, [props.edges, props.selectedId, props.traceNodeIds, props.traceActive, setEdges]);

  const focusNode = useCallback(
    (id: string) => {
      const node = getNode(id) ?? props.nodes.find((n) => n.id === id);
      if (node) {
        setCenter(node.position.x + 110, node.position.y + 40, {
          zoom: 1.1,
          duration: 400,
        });
      }
    },
    [getNode, props.nodes, setCenter],
  );

  // Selection-driven recentering effect: centers the node when selectedId changes externally
  useEffect(() => {
    if (props.selectedId && props.selectedId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = props.selectedId;
      focusNode(props.selectedId);
    } else if (!props.selectedId) {
      lastSelectedIdRef.current = null;
    }
  }, [props.selectedId, focusNode]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <GraphToolbar
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFit={() => fitView({ duration: 300, padding: 0.25 })}
        onRelayout={() => setLayoutSeed((s) => s + 1)}
        onOpenSearch={props.onOpenSearch}
        traceActive={Boolean(props.traceActive)}
        onTraceToggle={props.onTraceToggle || (() => {})}
        panelOpen={props.panelOpen}
        onPanelToggle={props.onPanelToggle}
        onOpenSidebar={props.onOpenSidebar}
        nodeCount={props.nodes.length}
        edgeCount={props.edges.length}
      />
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: false }}
          onNodeClick={(_, node) => {
            lastSelectedIdRef.current = node.id;
            props.onSelect(node.id);
            focusNode(node.id);
          }}
          onPaneClick={() => {
            lastSelectedIdRef.current = null;
            props.onSelect(null);
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="var(--color-border-strong)"
          />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            maskColor="oklch(0.17 0.014 260 / 0.7)"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
            nodeColor={() => "var(--color-border-strong)"}
            className="hidden sm:block"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
