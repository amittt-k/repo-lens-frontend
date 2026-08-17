import { ChevronDown, CornerDownRight, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mockFlows } from "@/data/mock-repo";
import { EmptyState, PanelHeading } from "./primitives";

export function FlowTracePanel({
  activeFlowId,
  onFlowChange,
  onStepSelect,
  selectedNodeId,
  className,
}: {
  activeFlowId: string | null;
  onFlowChange: (id: string | null) => void;
  onStepSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  className?: string;
}) {
  const flow = mockFlows.find((f) => f.id === activeFlowId) ?? null;

  return (
    <section className={cn("panel-surface flex flex-col overflow-hidden rounded-lg", className)}>
      <PanelHeading
        title="Flow tracing"
        hint={flow ? `${flow.steps.length} steps` : "Follow execution across files"}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <RouteIcon className="size-3.5" />
                {flow ? flow.name : "Select flow"}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mockFlows.map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => onFlowChange(f.id)}>
                  {f.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => onFlowChange(null)}>Clear trace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      {flow ? (
        <ol className="space-y-1 p-3">
          {flow.steps.map((step, i) => (
            <li key={`${step.nodeId}-${i}`}>
              <button
                type="button"
                onClick={() => onStepSelect?.(step.nodeId)}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                  selectedNodeId === step.nodeId
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-background/40 hover:border-border-strong",
                )}
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-border-strong font-mono text-[10px] tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-foreground">
                    {step.label}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-start gap-1 text-[11px] leading-snug text-muted-foreground">
                    <CornerDownRight className="mt-0.5 size-3 shrink-0" />
                    <span className="min-w-0">{step.detail}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={<RouteIcon className="size-4" />}
          title="No flow traced"
          description="Choose a traced flow to highlight the path execution takes through the graph."
        />
      )}
    </section>
  );
}
