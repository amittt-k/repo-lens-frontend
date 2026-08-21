import {
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  Component,
  ExternalLink,
  FileCode,
  FileCode2,
  Globe,
  Layers,
  Loader2,
  MousePointerClick,
  Package,
  Route as RouteIcon,
  Terminal,
  Variable,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeDetails, useNodeRelationships } from "@/hooks/useRepositoryData";
import { getKindTokens, getRelationTokens } from "@/lib/graph-tokens";
import { AiExplanationPanel } from "./AiExplanationPanel";
import { EmptyState, KindBadge, PanelHeading, RelationDot } from "./primitives";

export interface NodeDetailsPanelProps {
  node: {
    id: string;
    label?: string;
    path?: string;
    kind?: any;
    loc?: number;
    exports?: string[];
    imports?: string[];
    summary?: string;
  } | null;
  edges?: any[];
  nodesById?: Record<string, any> | undefined;
  onSelectNode?: (nodeId: string) => void;
  onTrace?: () => void;
}

const kindIcons: Record<string, any> = {
  file: FileCode,
  module: Box,
  component: Component,
  function: FileCode2,
  class: Layers,
  method: Terminal,
  type: Layers,
  variable: Variable,
  api_route: RouteIcon,
  package: Package,
  external: Package,
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NodeDetailsPanel({
  node,
  nodesById = {},
  onSelectNode,
  onTrace,
}: NodeDetailsPanelProps) {
  const nodeId = node?.id;
  const { data: liveNode, isLoading: nodeLoading } = useNodeDetails(nodeId);
  const { data: relationshipsData } = useNodeRelationships(nodeId);

  if (!nodeId) {
    return (
      <div className="panel-surface flex h-full flex-col overflow-hidden rounded-md">
        <PanelHeading title="Node Details" />
        <EmptyState
          className="flex-1"
          icon={<MousePointerClick className="size-3.5" />}
          title="No entity selected"
          description="Click any node in the graph or file tree to inspect its AST metadata, calls, and relationships."
        />
      </div>
    );
  }

  if (nodeLoading && !liveNode) {
    return (
      <div className="panel-surface flex h-full flex-col items-center justify-center p-6 font-mono text-xs text-muted-foreground">
        <Loader2 className="mb-2 size-4 animate-spin text-primary" />
        Loading entity details…
      </div>
    );
  }

  const fallbackFromGraph = nodesById[nodeId];
  const effectiveNode = liveNode || {
    id: nodeId,
    label: fallbackFromGraph?.label || node?.label || nodeId,
    type: fallbackFromGraph?.kind || node?.kind || "file",
    entityType: "Entity",
    data: {
      filePath: fallbackFromGraph?.path || node?.path || "",
      loc: fallbackFromGraph?.loc || node?.loc,
    },
  };

  const nodeData = (effectiveNode.data || {}) as Record<string, any>;
  const nodeType = (effectiveNode.type || "file").toLowerCase();
  const Icon = kindIcons[nodeType] || Box;
  const kindToken = getKindTokens(nodeType);

  const outgoing = relationshipsData?.outgoing || [];
  const incoming = relationshipsData?.incoming || [];

  // Contained declarations (e.g. methods inside a class, or symbols inside a file)
  const containedRels = outgoing.filter(
    (r) => r.relationshipType.toUpperCase() === "CONTAINS",
  );
  const dependsOnRels = outgoing.filter(
    (r) => r.relationshipType.toUpperCase() !== "CONTAINS",
  );

  const lineDisplay =
    nodeData["startLine"] && nodeData["endLine"]
      ? `L${nodeData["startLine"]}–${nodeData["endLine"]}`
      : nodeData["startLine"]
        ? `L${nodeData["startLine"]}`
        : null;

  const locDisplay = nodeData["loc"]
    ? `${nodeData["loc"]} LOC`
    : nodeData["startLine"] && nodeData["endLine"]
      ? `${nodeData["endLine"] - nodeData["startLine"] + 1} LOC`
      : null;

  return (
    <div className="panel-surface flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md">
      <PanelHeading
        title="Node Inspector"
        hint={nodeData["filePath"] || effectiveNode.label}
        action={<KindBadge kind={nodeType} />}
      />

      <ScrollArea className="min-h-0 min-w-0 flex-1 w-full overflow-hidden">
        <div className="space-y-3.5 p-3.5 min-w-0 max-w-full overflow-x-hidden">
          {/* Header Card */}
          <div className="min-w-0 max-w-full overflow-hidden rounded border border-border bg-surface/60 p-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded border border-border bg-elevated">
                <Icon className={`size-3.5 ${kindToken.text}`} />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h4
                  className="truncate font-mono text-xs font-semibold text-foreground"
                  title={effectiveNode.label}
                >
                  {effectiveNode.label}
                </h4>
                <p
                  className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
                  title={nodeData["filePath"] || "External Module"}
                >
                  {nodeData["filePath"] || "External Module"}
                </p>
              </div>
            </div>

            {/* API Route Callout */}
            {nodeType === "api_route" && (
              <div className="mt-2 flex min-w-0 items-center gap-2 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 font-mono text-xs text-purple-300">
                <Globe className="size-3 shrink-0" />
                <span className="shrink-0 font-bold uppercase tracking-wider">
                  {nodeData["method"] || "ROUTE"}
                </span>
                <span className="truncate" title={nodeData["path"] || effectiveNode.label}>
                  {nodeData["path"] || effectiveNode.label}
                </span>
              </div>
            )}
          </div>

          {/* Quick Metrics KPI row (3 equal columns with min-w-0) */}
          <dl className="grid w-full min-w-0 grid-cols-3 gap-1.5 text-center">
            {[
              { k: "Lines", v: locDisplay || (lineDisplay ? lineDisplay : "—") },
              { k: "Depends on", v: String(dependsOnRels.length) },
              { k: "Used by", v: String(incoming.length) },
            ].map((s) => (
              <div
                key={s.k}
                className="flex min-w-0 flex-col justify-center overflow-hidden rounded border border-border bg-surface/50 px-1.5 py-1.5"
              >
                <dt
                  className="truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                  title={s.k}
                >
                  {s.k}
                </dt>
                <dd
                  className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-foreground"
                  title={typeof s.v === "string" ? s.v : undefined}
                >
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>

          {/* Main Inspection Tabs */}
          <Tabs defaultValue="details" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-3 h-7 p-0.5 min-w-0 bg-elevated/70">
              <TabsTrigger value="details" className="truncate font-mono text-[11px] px-1 h-6">
                Details
              </TabsTrigger>
              <TabsTrigger
                value="relations"
                className="truncate font-mono text-[11px] px-1 h-6"
                title={`Relations (${outgoing.length + incoming.length})`}
              >
                Relations ({outgoing.length + incoming.length})
              </TabsTrigger>
              <TabsTrigger value="ai" className="truncate font-mono text-[11px] px-1 h-6">
                AI
              </TabsTrigger>
            </TabsList>

            {/* Details & Symbol Metadata Tab */}
            <TabsContent value="details" className="mt-2.5 space-y-2.5 min-w-0">
              <div className="space-y-1.5 rounded border border-border bg-surface/40 p-2.5 min-w-0 overflow-hidden">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Source Metadata
                </p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] min-w-0">
                  <div className="min-w-0 overflow-hidden">
                    <span className="text-muted-foreground">Kind: </span>
                    <span className="truncate text-foreground font-medium">{effectiveNode.type}</span>
                  </div>
                  {lineDisplay ? (
                    <div className="min-w-0 overflow-hidden">
                      <span className="text-muted-foreground">Range: </span>
                      <span className="truncate text-foreground" title={lineDisplay}>
                        {lineDisplay}
                      </span>
                    </div>
                  ) : null}
                  {nodeData["isExported"] !== undefined ? (
                    <div className="min-w-0 overflow-hidden">
                      <span className="text-muted-foreground">Exported: </span>
                      <span className="text-foreground">
                        {nodeData["isExported"] ? "Yes" : "No"}
                      </span>
                    </div>
                  ) : null}
                  {nodeData["size"] ? (
                    <div className="min-w-0 overflow-hidden">
                      <span className="text-muted-foreground">Size: </span>
                      <span className="truncate text-foreground">
                        {formatBytes(nodeData["size"])}
                      </span>
                    </div>
                  ) : null}
                  {nodeData["handler"] ? (
                    <div className="col-span-2 min-w-0 overflow-hidden">
                      <span className="text-muted-foreground">Handler: </span>
                      <code
                        className="break-all font-mono text-[10px] text-primary font-medium"
                        title={nodeData["handler"]}
                      >
                        {nodeData["handler"]}
                      </code>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Contained Declarations */}
              {containedRels.length > 0 ? (
                <div className="min-w-0">
                  <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contained Symbols ({containedRels.length})
                  </p>
                  <ul className="space-y-1 min-w-0">
                    {containedRels.map((rel) => {
                      const targetEntity = nodesById[rel.targetId];
                      const targetLabel = targetEntity?.label || rel.targetId;
                      const targetKind = (targetEntity?.kind || "symbol").toLowerCase();
                      const targetTokens = getKindTokens(targetKind);

                      return (
                        <li key={rel.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectNode?.(rel.targetId)}
                            className="group flex w-full min-w-0 items-center justify-between gap-2 rounded border border-border bg-surface/40 px-2 py-1 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                          >
                            <span className="min-w-0 flex-1 overflow-hidden">
                              <span
                                className="block truncate font-mono text-xs text-foreground group-hover:text-primary"
                                title={targetLabel}
                              >
                                {targetLabel}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 rounded px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider ${targetTokens.badge}`}
                            >
                              {targetTokens.label}
                            </span>
                            <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            {/* Relationships Tab */}
            <TabsContent value="relations" className="mt-2.5 space-y-3 min-w-0">
              {/* Outbound ("Depends on") */}
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Depends on ({dependsOnRels.length})
                </p>
                {dependsOnRels.length > 0 ? (
                  <ul className="space-y-1 min-w-0">
                    {dependsOnRels.map((rel) => {
                      const targetEntity = nodesById[rel.targetId];
                      const targetLabel = targetEntity?.label || rel.targetId;
                      const targetPath = targetEntity?.path || "";
                      const relToken = getRelationTokens(rel.relationshipType);

                      return (
                        <li key={rel.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectNode?.(rel.targetId)}
                            className="group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-border bg-surface/40 px-2 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                          >
                            <RelationDot relation={rel.relationshipType} />
                            <span className="min-w-0 overflow-hidden">
                              <span
                                className="block truncate font-mono text-xs text-foreground group-hover:text-primary"
                                title={targetLabel}
                              >
                                {targetLabel}
                              </span>
                              <span
                                className="block truncate font-mono text-[10px] text-muted-foreground"
                                title={`${relToken.label}${targetPath ? ` · ${targetPath}` : ""}`}
                              >
                                {relToken.label} {targetPath ? `· ${targetPath}` : ""}
                              </span>
                            </span>
                            <ArrowUpRight className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="font-mono text-[11px] text-muted-foreground">No outbound dependencies recorded.</p>
                )}
              </div>

              {/* Inbound ("Used by") */}
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Used by ({incoming.length})
                </p>
                {incoming.length > 0 ? (
                  <ul className="space-y-1 min-w-0">
                    {incoming.map((rel) => {
                      const sourceEntity = nodesById[rel.sourceId];
                      const sourceLabel = sourceEntity?.label || rel.sourceId;
                      const sourcePath = sourceEntity?.path || "";
                      const relToken = getRelationTokens(rel.relationshipType);

                      return (
                        <li key={rel.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectNode?.(rel.sourceId)}
                            className="group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border border-border bg-surface/40 px-2 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                          >
                            <RelationDot relation={rel.relationshipType} />
                            <span className="min-w-0 overflow-hidden">
                              <span
                                className="block truncate font-mono text-xs text-foreground group-hover:text-primary"
                                title={sourceLabel}
                              >
                                {sourceLabel}
                              </span>
                              <span
                                className="block truncate font-mono text-[10px] text-muted-foreground"
                                title={`${relToken.label}${sourcePath ? ` · ${sourcePath}` : ""}`}
                              >
                                {relToken.label} {sourcePath ? `· ${sourcePath}` : ""}
                              </span>
                            </span>
                            <ArrowDownLeft className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="font-mono text-[11px] text-muted-foreground">No inbound references recorded.</p>
                )}
              </div>

              {onTrace ? (
                <Button variant="outline" size="sm" className="w-full shrink-0 h-7 font-mono text-xs" onClick={onTrace}>
                  Trace flow through this node
                </Button>
              ) : null}
            </TabsContent>

            {/* AI Explanation Tab */}
            <TabsContent value="ai" className="mt-2.5 min-w-0">
              <AiExplanationPanel
                mode="node"
                nodeId={nodeId}
                node={effectiveNode as any}
                embedded
                className="min-w-0"
              />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
