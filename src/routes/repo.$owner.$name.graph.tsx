import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GraphSidebar } from "@/components/repolens/GraphSidebar";
import { NodeDetailsPanel } from "@/components/repolens/NodeDetailsPanel";
import { SearchPalette } from "@/components/repolens/SearchPalette";
import { EmptyState } from "@/components/repolens/primitives";
import { mockFileTree, mockFlows, mockGraphEdges, mockGraphNodes } from "@/data/mock-repo";
import { useGraphShortcuts } from "@/hooks/useGraphShortcuts";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";

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
  const { owner, name } = Route.useParams();
  const {
    selectedId,
    selected,
    setSelectedId,
    activeFlowId,
    setActiveFlowId,
    traceActive,
    traceNodeIds,
    filters,
    setFilters,
    resetFilters,
    nodesById,
  } = useWorkspaceState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useGraphShortcuts({ onOpenSearch: () => setSearchOpen(true) });

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

  const handlePanelToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobilePanelOpen((o) => !o);
    } else {
      setPanelOpen((o) => !o);
    }
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <h1 className="sr-only">
        {owner}/{name} dependency graph workspace
      </h1>

      {/* Left rail: structure + filters (Desktop) */}
      <aside
        className={`hidden shrink-0 flex-col gap-3 border-border p-3 lg:flex lg:h-full lg:overflow-hidden lg:border-r ${
          sidebarOpen ? "lg:w-[320px]" : "lg:w-[60px]"
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className="hidden w-full justify-start gap-2 text-xs lg:flex"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
          {sidebarOpen ? "Collapse" : null}
        </Button>

        {sidebarOpen ? (
          <ScrollArea className="min-h-0 flex-1">
            <GraphSidebar
              tree={mockFileTree}
              flows={mockFlows}
              selectedId={selectedId}
              onSelectNode={setSelectedId}
              activeFlowId={activeFlowId}
              onFlowChange={setActiveFlowId}
              filters={filters}
              onFiltersChange={setFilters}
              className="space-y-3 pr-2"
              explorerHeight="h-[300px]"
            />
          </ScrollArea>
        ) : null}
      </aside>

      {/* Graph canvas */}
      <section className="relative min-h-0 min-w-0 flex-1">
        {nodes.length === 0 ? (
          <div className="flex h-full flex-1 items-center justify-center p-6">
            <EmptyState
              title="Every node is filtered out"
              description="Re-enable at least one node type in the relationship filters to draw the graph."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          </div>
        ) : (
          <ClientOnly fallback={<CanvasFallback />}>
            <Suspense fallback={<CanvasFallback />}>
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id && typeof window !== "undefined" && window.innerWidth < 1024) {
                    setMobilePanelOpen(true);
                  }
                }}
                traceNodeIds={traceNodeIds}
                traceActive={traceActive}
                onTraceToggle={(next) =>
                  setActiveFlowId(next ? (activeFlowId ?? mockFlows[0]!.id) : null)
                }
                onOpenSearch={() => setSearchOpen(true)}
                onOpenSidebar={() => setMobileSidebarOpen(true)}
                panelOpen={panelOpen}
                onPanelToggle={handlePanelToggle}
              />
            </Suspense>
          </ClientOnly>
        )}
      </section>

      {/* Right rail: node details + AI (Desktop) */}
      {panelOpen ? (
        <aside className="hidden shrink-0 border-border p-3 lg:flex lg:h-full lg:w-[360px] lg:overflow-hidden lg:border-l">
          <div className="h-full w-full lg:overflow-hidden">
            <NodeDetailsPanel
              node={selected}
              edges={mockGraphEdges}
              nodesById={nodesById}
              onTrace={() => {
                const flow = mockFlows.find((f) => f.steps.some((s) => s.nodeId === selectedId));
                setActiveFlowId(flow?.id ?? mockFlows[0]!.id);
              }}
            />
          </div>
        </aside>
      ) : null}

      {/* Mobile Left Sheet: Structure & Filters */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="flex h-full w-[85vw] max-w-sm flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="text-base font-semibold">Repository controls</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              File structure, relationship filters and flow tracing.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <GraphSidebar
                tree={mockFileTree}
                flows={mockFlows}
                selectedId={selectedId}
                onSelectNode={(nodeId) => {
                  setSelectedId(nodeId);
                  setMobileSidebarOpen(false);
                }}
                activeFlowId={activeFlowId}
                onFlowChange={setActiveFlowId}
                filters={filters}
                onFiltersChange={setFilters}
                className="space-y-3"
                explorerHeight="h-[280px]"
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Mobile Right Sheet: Node Details & AI */}
      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="right" className="flex h-full w-[85vw] max-w-sm flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="text-base font-semibold">Node inspection</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Relationships, exported symbols and AI explanation.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 p-4">
            <NodeDetailsPanel
              node={selected}
              edges={mockGraphEdges}
              nodesById={nodesById}
              onTrace={() => {
                const flow = mockFlows.find((f) => f.steps.some((s) => s.nodeId === selectedId));
                setActiveFlowId(flow?.id ?? mockFlows[0]!.id);
                setMobilePanelOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <SearchPalette
        nodes={mockGraphNodes}
        visibleIds={visibleIds}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectNode={setSelectedId}
      />
    </main>
  );
}
