import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileExplorer } from "@/components/repolens/FileExplorer";
import { FlowTracePanel } from "@/components/repolens/FlowTracePanel";
import { NodeDetailsPanel } from "@/components/repolens/NodeDetailsPanel";
import {
  RelationshipFilters,
  allKinds,
  allRelations,
  type FilterState,
} from "@/components/repolens/RelationshipFilters";
import { SearchPalette } from "@/components/repolens/SearchPalette";
import { EmptyState, PanelHeading } from "@/components/repolens/primitives";
import { mockFlows, mockGraphEdges, mockGraphNodes } from "@/data/mock-repo";

// React Flow measures real DOM, so the canvas is loaded on the client only.
const GraphCanvas = lazy(() => import("@/components/repolens/graph/GraphCanvas"));

export const Route = createFileRoute("/repo/$owner/$name/graph")({
  head: ({ params }) => {
    const title = `${params.owner}/${params.name} graph workspace — RepoLens`;
    const description = `Interactive dependency graph, relationship filters and flow tracing for ${params.owner}/${params.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: GraphWorkspace,
});

function CanvasFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Preparing graph canvas…
    </div>
  );
}

function GraphWorkspace() {
  const [selectedId, setSelectedId] = useState<string | null>("n-cart-store");
  const [filters, setFilters] = useState<FilterState>({
    relations: allRelations,
    kinds: allKinds,
  });
  const [traceMode, setTraceMode] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing) return;
      if (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nodes = useMemo(
    () => mockGraphNodes.filter((n) => filters.kinds.includes(n.kind)),
    [filters.kinds],
  );
  const visibleIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const edges = useMemo(
    () =>
      mockGraphEdges.filter(
        (e) =>
          filters.relations.includes(e.relation) &&
          visibleIds.has(e.source) &&
          visibleIds.has(e.target),
      ),
    [filters.relations, visibleIds],
  );

  const traceNodeIds = useMemo(() => {
    if (!traceMode || !flowId) return [];
    return mockFlows.find((f) => f.id === flowId)?.steps.map((s) => s.nodeId) ?? [];
  }, [traceMode, flowId]);

  const selected = mockGraphNodes.find((n) => n.id === selectedId) ?? null;

  return (
    <main className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-57px)] lg:flex-row">
      {/* Left rail: structure + filters */}
      <aside
        className={`flex shrink-0 flex-col gap-3 border-border p-3 lg:h-full lg:overflow-hidden lg:border-r ${
          sidebarOpen ? "lg:w-[320px]" : "lg:w-[60px]"
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className="hidden w-full justify-start gap-2 text-xs lg:flex"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          {sidebarOpen ? "Collapse" : null}
        </Button>

        {sidebarOpen ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 pr-2">
              <section className="panel-surface flex h-[300px] flex-col overflow-hidden rounded-lg">
                <PanelHeading title="Explorer" hint="Click a file to select its node" />
                <FileExplorer
                  selectedId={selectedId}
                  onSelect={(node) => setSelectedId(node.id)}
                  className="flex-1"
                />
              </section>
              <RelationshipFilters value={filters} onChange={setFilters} />
              <FlowTracePanel
                activeFlowId={flowId}
                onFlowChange={(id) => {
                  setFlowId(id);
                  setTraceMode(Boolean(id));
                }}
                onStepSelect={setSelectedId}
                selectedNodeId={selectedId}
              />
            </div>
          </ScrollArea>
        ) : null}
      </aside>

      {/* Graph canvas */}
      <section className="relative flex h-[70vh] min-w-0 flex-1 flex-col lg:h-full">
        {nodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              title="Every node is filtered out"
              description="Re-enable at least one node type in the relationship filters to draw the graph."
            />
          </div>
        ) : (
          <ClientOnly fallback={<CanvasFallback />}>
            <Suspense fallback={<CanvasFallback />}>
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                selectedId={selectedId}
                onSelect={setSelectedId}
                traceNodeIds={traceNodeIds}
                traceMode={traceMode}
                onTraceModeChange={(next) => {
                  setTraceMode(next);
                  if (next && !flowId) setFlowId(mockFlows[0]!.id);
                }}
                onOpenSearch={() => setSearchOpen(true)}
                panelOpen={panelOpen}
                onPanelToggle={() => setPanelOpen((o) => !o)}
              />
            </Suspense>
          </ClientOnly>
        )}
      </section>

      {/* Right rail: node details + AI */}
      {panelOpen ? (
        <aside className="shrink-0 border-border p-3 lg:h-full lg:w-[360px] lg:overflow-hidden lg:border-l">
          <div className="h-full lg:overflow-hidden">
            <NodeDetailsPanel
              node={selected}
              edges={mockGraphEdges}
              onTrace={() => {
                const flow = mockFlows.find((f) => f.steps.some((s) => s.nodeId === selectedId));
                setFlowId(flow?.id ?? mockFlows[0]!.id);
                setTraceMode(true);
              }}
            />
          </div>
        </aside>
      ) : null}

      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectNode={setSelectedId}
      />
    </main>
  );
}
