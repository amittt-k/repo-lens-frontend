import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
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
  const prevPosById = new Map(prevNodes?.map((n) => [n.id, n.position]));
  return sourceNodes.map((n, i) => {
    const cols = 5;
    const defaultPos =
      seed === 0
        ? n.position
        : { x: (i % cols) * 300 + 40, y: Math.floor(i / cols) * 170 + 40 };

    const position = prevPosById.get(n.id) ?? defaultPos;
    const isSelected = selectedId === n.id;
    const isNeighbor = connectedIds.has(n.id);
    const hasSelection = Boolean(selectedId);
    const dimmed = hasSelection ? !isSelected && !isNeighbor : isTraceActive && traceIds.length > 0 && !traceIds.includes(n.id);

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
        inTrace: traceIds.includes(n.id),
        inHighlight: isNeighbor && !isSelected,
        dimmed,
      } satisfies CodeNodePayload,
    } satisfies Node;
  });
}

function mapEdges(
  sourceEdges: GraphEdgeData[],
  selectedId: string | null,
  traceIds: string[] = [],
  isTraceActive = false,
): Edge[] {
  const hasSelection = Boolean(selectedId);

  return sourceEdges.map((e) => {
    const isConnected = hasSelection && (e.source === selectedId || e.target === selectedId);
    const inTrace = traceIds.includes(e.source) && traceIds.includes(e.target);
    const dimmed = hasSelection ? !isConnected : isTraceActive && traceIds.length > 0 && !inTrace;

    const relTokens = getRelationTokens(e.relation || (e as any).relationshipType || (e as any).symbol);

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: relTokens.label,
      animated: isConnected || inTrace,
      style: {
        stroke: isConnected
          ? "var(--color-primary)"
          : inTrace
            ? "var(--color-primary)"
            : relTokens.cssVar,
        strokeWidth: isConnected ? 2.5 : inTrace ? 2 : 1.2,
        opacity: dimmed ? 0.1 : isConnected ? 1 : 0.8,
        strokeDasharray: relTokens.dash,
      },
      labelStyle: {
        fill: "var(--color-muted-foreground)",
        fontSize: 9,
        fontFamily: "var(--font-mono)",
      },
      labelBgStyle: {
        fill: "var(--color-background)",
        opacity: dimmed ? 0 : 0.9,
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

  // Sync nodes when inputs change, preserving dragged positions
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

  // Sync edges when edges or selection/trace state changes
  useEffect(() => {
    setEdges(mapEdges(props.edges, props.selectedId, props.traceNodeIds, props.traceActive));
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
