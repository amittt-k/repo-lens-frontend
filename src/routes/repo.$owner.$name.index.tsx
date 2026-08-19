import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Network } from "lucide-react";


import { Button } from "@/components/ui/button";
import { AiExplanationPanel } from "@/components/repolens/AiExplanationPanel";
import { CompositionPanel } from "@/components/repolens/CompositionPanel";
import { FileExplorer } from "@/components/repolens/FileExplorer";
import { FlowTracePanel } from "@/components/repolens/FlowTracePanel";
import { HotspotsPanel } from "@/components/repolens/HotspotsPanel";
import { PanelHeading, StatTile } from "@/components/repolens/primitives";
import {
  mockFileTree,
  mockFlows,
  mockGraphEdges,
  mockGraphNodes,
  mockRepo,
  type RelationKind,
} from "@/data/mock-repo";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";

export const Route = createFileRoute("/repo/$owner/$name/")({
  head: ({ params }) => {
    const title = `${params.owner}/${params.name} overview — RepoLens`;
    const description = `Structure, hotspots and code relationships for ${params.owner}/${params.name}, mapped by RepoLens.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Overview,
});

function Overview() {
  const { owner, name } = Route.useParams();
  const navigate = useNavigate();
  const { selectedId, selected, setSelectedId, activeFlowId, setActiveFlowId } =
    useWorkspaceState();

  const relationCounts = (["import", "call", "export"] as RelationKind[]).map((relation) => ({
    relation,
    count: mockGraphEdges.filter((e) => e.relation === relation).length,
  }));

  const hotspots = [...mockGraphNodes]
    .map((n) => ({ node: n, degree: mockGraphEdges.filter((e) => e.target === n.id).length }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:overflow-y-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {owner}/{name}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {mockRepo.description}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link to="/repo/$owner/$name/graph" params={{ owner, name }} search={(prev) => prev}>
            <Network className="size-3.5" />
            <span className="hidden sm:inline">Open graph</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Files" value={String(mockRepo.files)} sub={`${mockRepo.directories} directories`} />
        <StatTile label="Lines of code" value={mockRepo.linesOfCode} sub={mockRepo.language} />
        <StatTile label="Graph nodes" value={String(mockGraphNodes.length)} sub="in the sampled slice" />
        <StatTile label="Relationships" value={String(mockGraphEdges.length)} sub="imports · calls · exports" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        <section className="panel-surface flex h-[520px] flex-col overflow-hidden rounded-lg">
          <PanelHeading title="File explorer" hint={`${mockRepo.files} files indexed`} />
          <FileExplorer
            tree={mockFileTree}
            selectedId={selectedId}
            onSelect={(node) => setSelectedId(node.id)}
            className="flex-1"
          />
        </section>

        <div className="grid min-w-0 gap-4">
          <CompositionPanel repo={mockRepo} relationCounts={relationCounts} />
          <HotspotsPanel hotspots={hotspots} onSelectNode={(id) => setSelectedId(id)} />
        </div>

        <div className="grid content-start gap-4">
          <FlowTracePanel
            flows={mockFlows}
            activeFlowId={activeFlowId}
            onFlowChange={setActiveFlowId}
            onStepSelect={(nodeId) => setSelectedId(nodeId)}
            selectedNodeId={selectedId}
          />
          <AiExplanationPanel node={selected} />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: "/repo/$owner/$name/graph",
                params: { owner, name },
                search: (prev) => prev,
              })
            }
          >
            Inspect in graph workspace
          </Button>
        </div>
      </div>
    </main>
  );
}
