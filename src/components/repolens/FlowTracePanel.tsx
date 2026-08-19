import {
  ChevronDown,
  CornerDownRight,
  Route as RouteIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getRelationTokens } from "@/lib/graph-tokens";
import type { TracedFlow } from "@/utils/flowTracing";
import { EmptyState, PanelHeading, RelationDot } from "./primitives";

export interface FlowTracePanelProps {
  flows?: TracedFlow[] | undefined;
  activeFlow?: TracedFlow | null | undefined;
  activeFlowId: string | null;
  onFlowChange: (id: string | null) => void;
  onStepSelect?: ((nodeId: string) => void) | undefined;
  selectedNodeId?: string | null | undefined;
  className?: string | undefined;
}

export function FlowTracePanel({
  flows = [],
  activeFlow,
  activeFlowId,
  onFlowChange,
  onStepSelect,
  selectedNodeId,
  className,
}: FlowTracePanelProps) {
  const currentFlow =
    activeFlow || (flows.find((f) => f.id === activeFlowId || f.startNodeId === activeFlowId) ?? null);


  return (
    <section className={cn("panel-surface flex flex-col overflow-hidden rounded-lg", className)}>
      <PanelHeading
        title="Flow Tracing"
        hint={
          currentFlow
            ? currentFlow.isLeaf
              ? "Single-node (leaf)"
              : `${currentFlow.steps.length} steps`
            : "Trace execution path"
        }
        action={
          <div className="flex items-center gap-1">
            {currentFlow ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => onFlowChange(null)}
                title="Clear active trace"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}

            {flows.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <RouteIcon className="size-3.5" />
                    <span className="max-w-[110px] truncate">
                      {currentFlow ? currentFlow.name : "Select flow"}
                    </span>
                    <ChevronDown className="size-3 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                  {flows.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onSelect={() => onFlowChange(f.startNodeId || f.id)}
                      className="text-xs"
                    >
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => onFlowChange(null)} className="text-xs text-muted-foreground">
                    Clear trace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />

      {currentFlow ? (
        <div className="p-3">
          <ol className="space-y-1.5">
            {currentFlow.steps.map((step, i) => {
              const relToken = step.relationshipType ? getRelationTokens(step.relationshipType) : null;
              const isSelected = selectedNodeId === step.nodeId;

              return (
                <li key={`${step.nodeId}-${i}`}>
                  {/* Step item */}
                  <button
                    type="button"
                    onClick={() => onStepSelect?.(step.nodeId)}
                    className={cn(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-border bg-background/40 hover:border-border-strong hover:bg-background/60",
                    )}
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-border-strong font-mono text-[10px] tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs font-medium text-foreground">
                        {step.label}
                      </span>
                      {step.path ? (
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          {step.path}
                        </span>
                      ) : null}
                      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
                        <CornerDownRight className="size-3 shrink-0" />
                        <span className="truncate">{step.detail}</span>
                      </span>
                    </span>
                  </button>

                  {/* Transition arrow to next step */}
                  {i < currentFlow.steps.length - 1 && currentFlow.steps[i + 1]?.relationshipType ? (
                    <div className="my-1 flex items-center gap-1.5 pl-6 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      <RelationDot relation={currentFlow.steps[i + 1]!.relationshipType!} />
                      <span>{currentFlow.steps[i + 1]!.relationshipType}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <EmptyState
          icon={<RouteIcon className="size-4" />}
          title="No active flow trace"
          description="Click 'Trace flow through this node' in the Inspector or select an entry flow above to highlight the execution chain."
        />
      )}
    </section>
  );
}
