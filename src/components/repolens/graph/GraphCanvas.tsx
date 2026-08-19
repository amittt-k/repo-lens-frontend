import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import type { GraphEdgeData, GraphNodeData } from "@/data/mock-repo";
import { relationTokens } from "@/lib/graph-tokens";
import { GraphToolbar } from "../GraphToolbar";
import { CodeNode, type CodeNodePayload } from "./CodeNode";

const nodeTypes = { code: CodeNode };

export interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  traceNodeIds: string[];
  traceActive: boolean;
  onTraceToggle: (next: boolean) => void;
  onOpenSearch: () => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
}

function Canvas(props: GraphCanvasProps) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const [layoutSeed, setLayoutSeed] = useState(0);

  const rfNodes = useMemo<Node[]>(
    () =>
      props.nodes.map((n, i) => ({
        id: n.id,
        type: "code",
        position:
          layoutSeed === 0
            ? n.position
            : { x: (i % 3) * 290, y: Math.floor(i / 3) * 170 },
        selected: props.selectedId === n.id,
        data: {
          label: n.label,
          path: n.path,
          kind: n.kind,
          loc: n.loc,
          inTrace: props.traceNodeIds.includes(n.id),
          dimmed: props.traceMode && props.traceNodeIds.length > 0 && !props.traceNodeIds.includes(n.id),
        } satisfies CodeNodePayload,
      })),
    [props.nodes, props.selectedId, props.traceNodeIds, props.traceMode, layoutSeed],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      props.edges.map((e) => {
        const inTrace =
          props.traceNodeIds.includes(e.source) && props.traceNodeIds.includes(e.target);
        const dimmed = props.traceMode && props.traceNodeIds.length > 0 && !inTrace;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.symbol,
          animated: inTrace,
          style: {
            stroke: inTrace ? "var(--color-primary)" : relationTokens[e.relation].cssVar,
            strokeWidth: inTrace ? 2 : 1.2,
            opacity: dimmed ? 0.12 : 0.75,
            strokeDasharray: e.relation === "export" ? "4 3" : undefined,
          },
          labelStyle: {
            fill: "var(--color-muted-foreground)",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
          },
          labelBgStyle: { fill: "var(--color-background)", opacity: dimmed ? 0 : 0.9 },
        } satisfies Edge;
      }),
    [props.edges, props.traceNodeIds, props.traceMode],
  );

  const focusNode = useCallback(
    (id: string) => {
      const node = props.nodes.find((n) => n.id === id);
      if (node) setCenter(node.position.x + 100, node.position.y + 40, { zoom: 1.1, duration: 400 });
    },
    [props.nodes, setCenter],
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      <GraphToolbar
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFit={() => fitView({ duration: 300, padding: 0.2 })}
        onRelayout={() => setLayoutSeed((s) => (s === 0 ? 1 : 0))}
        onOpenSearch={props.onOpenSearch}
        traceMode={props.traceMode}
        onTraceModeChange={props.onTraceModeChange}
        panelOpen={props.panelOpen}
        onPanelToggle={props.onPanelToggle}
        nodeCount={props.nodes.length}
        edgeCount={props.edges.length}
      />
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: false }}
          onNodeClick={(_, node) => {
            props.onSelect(node.id);
            focusNode(node.id);
          }}
          onPaneClick={() => props.onSelect(null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--color-border-strong)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            maskColor="oklch(0.17 0.014 260 / 0.7)"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
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
