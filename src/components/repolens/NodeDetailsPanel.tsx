import { ArrowDownLeft, ArrowUpRight, FileCode2, MousePointerClick } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GraphEdgeData, GraphNodeData } from "@/data/mock-repo";
import { AiExplanationPanel } from "./AiExplanationPanel";
import { EmptyState, KindBadge, PanelHeading, RelationDot } from "./primitives";

function EdgeRow({
  edge,
  direction,
  nodesById,
}: {
  edge: GraphEdgeData;
  direction: "in" | "out";
  nodesById?: Record<string, GraphNodeData> | undefined;
}) {
  const otherId = direction === "out" ? edge.target : edge.source;
  const other = nodesById ? nodesById[otherId] : undefined;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-2">
      <RelationDot relation={edge.relation} />
      <span className="min-w-0">
        <span className="block truncate font-mono text-xs text-foreground">
          {other?.label ?? otherId}
        </span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {edge.symbol}
        </span>
      </span>
      {direction === "out" ? (
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ArrowDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </li>
  );
}

export interface NodeDetailsPanelProps {
  node: GraphNodeData | null;
  edges: GraphEdgeData[];
  nodesById?: Record<string, GraphNodeData> | undefined;
  onTrace?: () => void;
}

export function NodeDetailsPanel({
  node,
  edges,
  nodesById,
  onTrace,
}: NodeDetailsPanelProps) {
  if (!node) {
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

  const outgoing = edges.filter((e) => e.source === node.id);
  const incoming = edges.filter((e) => e.target === node.id);

  return (
    <div className="panel-surface flex h-full min-h-0 flex-col overflow-hidden rounded-lg">
      <PanelHeading
        title="Node details"
        hint={node.path}
        action={<KindBadge kind={node.kind} />}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <FileCode2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-foreground">{node.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{node.summary}</p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "LOC", v: node.loc ? String(node.loc) : "—" },
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
                Symbols
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 text-xs">
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="relations" className="mt-3 space-y-3">
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Depends on
                </p>
                {outgoing.length ? (
                  <ul className="space-y-1.5">
                    {outgoing.map((e) => (
                      <EdgeRow key={e.id} edge={e} direction="out" nodesById={nodesById} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Leaf node — no outbound edges.</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Used by
                </p>
                {incoming.length ? (
                  <ul className="space-y-1.5">
                    {incoming.map((e) => (
                      <EdgeRow key={e.id} edge={e} direction="in" nodesById={nodesById} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Entry point — nothing imports it.</p>
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
                  Exports
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.exports.length ? (
                    node.exports.map((s) => (
                      <code
                        key={s}
                        className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-primary"
                      >
                        {s}
                      </code>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No exported symbols.</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Imports
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.imports.length ? (
                    node.imports.map((s) => (
                      <code
                        key={s}
                        className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {s}
                      </code>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No imports.</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-3">
              <AiExplanationPanel node={node} embedded />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
