import {
  Crosshair,
  LayoutGrid,
  Maximize2,
  Minus,
  PanelLeft,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Route as RouteIcon,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded text-muted-foreground hover:bg-elevated hover:text-foreground"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-mono text-[11px]">{label}</TooltipContent>
    </Tooltip>
  );
}

export interface GraphToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onRelayout: () => void;
  onOpenSearch: () => void;
  traceActive: boolean;
  onTraceToggle: (next: boolean) => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
  onOpenSidebar?: (() => void) | undefined;
  nodeCount: number;
  edgeCount: number;
}

export function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFit,
  onRelayout,
  onOpenSearch,
  traceActive,
  onTraceToggle,
  panelOpen,
  onPanelToggle,
  onOpenSidebar,
  nodeCount,
  edgeCount,
}: GraphToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {onOpenSidebar ? (
            <div className="lg:hidden mr-1">
              <ToolButton label="Open structure & filters" onClick={onOpenSidebar}>
                <PanelLeft className="size-3.5" />
              </ToolButton>
            </div>
          ) : null}
          <ToolButton label="Zoom In (+)" onClick={onZoomIn}>
            <Plus className="size-3.5" />
          </ToolButton>
          <ToolButton label="Zoom Out (-)" onClick={onZoomOut}>
            <Minus className="size-3.5" />
          </ToolButton>
          <ToolButton label="Fit View (Space)" onClick={onFit}>
            <Maximize2 className="size-3.5" />
          </ToolButton>
          <ToolButton label="Re-layout Columns" onClick={onRelayout}>
            <LayoutGrid className="size-3.5" />
          </ToolButton>

          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />

          <ToolButton label="Search Nodes (Cmd/Ctrl + K or /)" onClick={onOpenSearch}>
            <Search className="size-3.5" />
          </ToolButton>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={traceActive}
                onPressedChange={onTraceToggle}
                size="sm"
                aria-label="Flow trace mode"
                className="h-7 gap-1 px-2 font-mono text-[10px] font-medium uppercase tracking-wider rounded data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
              >
                <RouteIcon className="size-3" />
                <span>Trace</span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px]">
              Highlight deterministic execution flow
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground sm:flex">
            <Crosshair className="size-3 text-muted-foreground/60" />
            <span>{nodeCount} nodes</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{edgeCount} edges</span>
          </span>
          <ToolButton
            label={panelOpen ? "Collapse Inspector" : "Expand Inspector"}
            onClick={onPanelToggle}
          >
            {panelOpen ? (
              <PanelRightClose className="size-3.5" />
            ) : (
              <PanelRightOpen className="size-3.5" />
            )}
          </ToolButton>
        </div>
      </div>
    </TooltipProvider>
  );
}
