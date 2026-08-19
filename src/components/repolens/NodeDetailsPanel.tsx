import { ArrowDownLeft, ArrowUpRight, FileCode2, Loader2, MousePointerClick } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeDetails, useNodeRelationships } from "@/hooks/useRepositoryData";
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
  onTrace?: () => void;
}

export function NodeDetailsPanel({
  node,
  onTrace,
}: NodeDetailsPanelProps) {
  const nodeId = node?.id;
  const { data: liveNode, isLoading: nodeLoading } = useNodeDetails(nodeId);
  const { data: relationshipsData, isLoading: relsLoading } = useNodeRelationships(nodeId);

  if (!nodeId) {
    return (
      <div className="panel-surface flex h-full flex-col overflow-hidden rounded-lg">
        <PanelHeading title="Node details" />
        <EmptyState
          className="flex-1"
          icon={<MousePointerClick className="size-4" />}
          title="No node selected"
          description="Pick a file in the explorer or click a node in the graph to inspect its relationships."
        />
      </div>
    );
  }

  if (nodeLoading || relsLoading) {
    return (
      <div className="panel-surface flex h-full flex-col items-center justify-center p-6 text-xs text-muted-foreground">
        <Loader2 className="mb-2 size-5 animate-spin text-primary" />
        Loading node details…
      </div>
    );
  }

  const effectiveNode = liveNode || {
    id: nodeId,
    label: node?.label || nodeId,
    type: node?.kind || "file",
    entityType: "Entity",
    data: {
      filePath: node?.path || "",
      loc: node?.loc,
    },
  };

  const nodeData = (effectiveNode.data || {}) as Record<string, any>;
  const outgoing = relationshipsData?.outgoing || [];
  const incoming = relationshipsData?.incoming || [];

  return (
    <div className="panel-surface flex h-full min-h-0 flex-col overflow-hidden rounded-lg">
      <PanelHeading
        title="Node details"
        hint={nodeData["filePath"] || effectiveNode.label}
        action={<KindBadge kind={(effectiveNode.type as any) || "module"} />}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <FileCode2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-foreground">{effectiveNode.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {effectiveNode.entityType}: {effectiveNode.type}
                {nodeData["startLine"] ? ` (lines ${nodeData["startLine"]}–${nodeData["endLine"]})` : ""}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "LOC", v: nodeData["loc"] ? String(nodeData["loc"]) : "—" },
              { k: "In", v: String(incoming.length) },
              { k: "Out", v: String(outgoing.length) },
            ].map((s) => (
              <div key={s.k} className="rounded-md border border-border bg-background/40 px-2 py-2">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.k}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{s.v}</dd>
              </div>
            ))}
          </dl>


          <Tabs defaultValue="relations">
            <TabsList className="w-full">
              <TabsTrigger value="relations" className="flex-1 text-xs">
                Relations
              </TabsTrigger>
              <TabsTrigger value="symbols" className="flex-1 text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 text-xs">
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="relations" className="mt-3 space-y-3">
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Depends on ({outgoing.length})
                </p>
                {outgoing.length ? (
                  <ul className="space-y-1.5">
                    {outgoing.map((rel) => (
                      <li
                        key={rel.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-2"
                      >
                        <RelationDot relation={rel.relationshipType.toLowerCase() as any} />
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-foreground">
                            {rel.targetId}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {rel.relationshipType}
                          </span>
                        </span>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Leaf node — no outbound dependencies.</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Used by ({incoming.length})
                </p>
                {incoming.length ? (
                  <ul className="space-y-1.5">
                    {incoming.map((rel) => (
                      <li
                        key={rel.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-2"
                      >
                        <RelationDot relation={rel.relationshipType.toLowerCase() as any} />
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-foreground">
                            {rel.sourceId}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {rel.relationshipType}
                          </span>
                        </span>
                        <ArrowDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Entry point — no inbound callers.</p>
                )}
              </div>
              {onTrace ? (
                <Button variant="outline" size="sm" className="w-full" onClick={onTrace}>
                  Trace flow through this node
                </Button>
              ) : null}
            </TabsContent>

            <TabsContent value="symbols" className="mt-3 space-y-3">
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Source Location
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {nodeData["filePath"] || "External package"}
                  {nodeData["startLine"] ? ` : ${nodeData["startLine"]}` : ""}
                </p>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Entity Kind
                </p>
                <code className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                  {effectiveNode.type}
                </code>
              </div>
            </TabsContent>


            <TabsContent value="ai" className="mt-3">
              <AiExplanationPanel node={effectiveNode as any} embedded />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

