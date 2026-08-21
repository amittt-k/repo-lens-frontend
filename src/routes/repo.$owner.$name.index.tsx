import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Network } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { CompositionPanel } from "@/components/repolens/CompositionPanel";
import { FileExplorer } from "@/components/repolens/FileExplorer";
import { HotspotsPanel } from "@/components/repolens/HotspotsPanel";
import { NodeDetailsPanel } from "@/components/repolens/NodeDetailsPanel";
import { AiExplanationPanel } from "@/components/repolens/AiExplanationPanel";
import { PanelHeading, StatTile } from "@/components/repolens/primitives";
import { useRepository, useRepositoryFiles, useRepositoryGraph } from "@/hooks/useRepositoryData";
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
  const { selectedId, setSelectedId, repoId } = useWorkspaceState();

  const effectiveRepoId = repoId || (owner && name ? `${owner}:${name}` : undefined);
  const { data: repository, isLoading: repoLoading } = useRepository(effectiveRepoId);
  const { data: fileTree, isLoading: filesLoading } = useRepositoryFiles(effectiveRepoId);
  const { data: graphData, isLoading: graphLoading } = useRepositoryGraph(effectiveRepoId);

  const totalFiles = repository?._count?.files ?? graphData?.stats?.nodesByType?.["file"] ?? 0;
  const totalNodes = graphData?.stats?.totalNodes ?? 0;
  const totalRelationships = repository?._count?.relationships ?? graphData?.stats?.totalEdges ?? 0;
  const totalRoutes = repository?._count?.apiRoutes ?? graphData?.stats?.nodesByType?.["api_route"] ?? 0;

  const relationCounts = useMemo(() => {
    if (!graphData?.stats?.edgesByType) return [];
    return Object.entries(graphData.stats.edgesByType).map(([relation, count]) => ({
      relation,
      count,
    }));
  }, [graphData]);

  const hotspots = useMemo(() => {
    if (!graphData?.nodes || !graphData?.edges) return [];
    const inboundCounts: Record<string, number> = {};
    for (const edge of graphData.edges) {
      inboundCounts[edge.target] = (inboundCounts[edge.target] || 0) + 1;
    }
    return graphData.nodes
      .map((node) => {
        const nodeData = (node.data || {}) as Record<string, any>;
        return {
          node: {
            id: node.id,
            label: node.label,
            path: nodeData["filePath"] || "",
          },
          degree: inboundCounts[node.id] || 0,
        };
      })
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 4);
  }, [graphData]);

  const nodesById = useMemo(() => {
    if (!graphData?.nodes) return {};
    return Object.fromEntries(
      graphData.nodes.map((n) => [
        n.id,
        {
          id: n.id,
          label: n.label,
          kind: n.type,
          path: (n.data as any)?.filePath || "",
          loc: (n.data as any)?.loc,
        },
      ]),
    );
  }, [graphData]);

  const isLoading = (repoLoading || filesLoading || graphLoading) && !repository && !graphData;

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {owner}/{name}
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {repository?.description || `Static code structure, symbol relationships, and architecture map.`}
          </p>
        </div>
        <Button asChild size="sm" className="h-8 gap-1.5 font-mono text-xs">
          <Link to="/repo/$owner/$name/graph" params={{ owner, name }} search={(prev) => prev}>
            <Network className="size-3.5" />
            <span>Interactive Graph</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading repository analysis data…
        </div>
      ) : (
        <>
          {/* Stat KPI Bar */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatTile
              label="Source Files"
              value={String(totalFiles)}
              sub={repository?.defaultBranch ? `branch: ${repository.defaultBranch}` : "indexed files"}
            />
            <StatTile
              label="Primary Language"
              value={repository?.language || "JavaScript"}
              sub={`${totalRoutes} API routes discovered`}
            />
            <StatTile
              label="AST Graph Nodes"
              value={String(totalNodes)}
              sub="files · functions · classes"
            />
            <StatTile
              label="Relationships"
              value={String(totalRelationships)}
              sub="imports · calls · contains"
            />
          </div>

          {/* 3-Column Grid */}
          <div className="mt-4 grid gap-3.5 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
            {/* Left Rail: File Explorer */}
            <section className="panel-surface flex h-[540px] flex-col overflow-hidden rounded-md">
              <PanelHeading title="File Explorer" hint={`${totalFiles} files`} />
              <FileExplorer
                tree={fileTree as any || []}
                selectedId={selectedId}
                onSelect={(node) => setSelectedId(node.id)}
                className="flex-1"
              />
            </section>

            {/* Middle Column: Composition, Hotspots, AI Overview */}
            <div className="grid min-w-0 gap-3.5 content-start">
              <CompositionPanel
                repo={{
                  language: repository?.language || "JavaScript/TypeScript",
                  languages: repository?.language ? [{ name: repository.language, share: 100 }] : [],
                }}
                relationCounts={relationCounts}
              />
              <HotspotsPanel hotspots={hotspots} onSelectNode={(id) => setSelectedId(id)} />
              <AiExplanationPanel
                mode="repository"
                repositoryId={repository?.id || repoId}
                repoName={`${owner}/${name}`}
              />
            </div>

            {/* Right Column: Node Details Inspector */}
            <div className="grid content-start gap-3 min-w-0">
              <div className="flex h-[495px] min-w-0 flex-col overflow-hidden">
                <NodeDetailsPanel
                  node={selectedId ? { id: selectedId, label: selectedId } : null}
                  nodesById={nodesById}
                  onSelectNode={(id) => setSelectedId(id)}
                  edges={[]}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 font-mono text-xs gap-1.5"
                onClick={() =>
                  navigate({
                    to: "/repo/$owner/$name/graph",
                    params: { owner, name },
                    search: (prev) => prev,
                  })
                }
              >
                <Network className="size-3.5" />
                View in Graph Workspace
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
