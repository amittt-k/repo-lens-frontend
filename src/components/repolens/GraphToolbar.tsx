import {
  Crosshair,
  LayoutGrid,
  Maximize2,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Route as RouteIcon,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        <Button variant="ghost" size="icon" className="size-8" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export interface GraphToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onRelayout: () => void;
  onOpenSearch: () => void;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
  nodeCount: number;
  edgeCount: number;
}

export function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFit,
  onRelayout,
  onOpenSearch,
  traceMode,
  onTraceModeChange,
  panelOpen,
  onPanelToggle,
  nodeCount,
  edgeCount,
}: GraphToolbarProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-surface/80 px-2 py-1.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        <ToolButton label="Zoom in" onClick={onZoomIn}>
          <Plus className="size-4" />
        </ToolButton>
        <ToolButton label="Zoom out" onClick={onZoomOut}>
          <Minus className="size-4" />
        </ToolButton>
        <ToolButton label="Fit view" onClick={onFit}>
          <Maximize2 className="size-4" />
        </ToolButton>
        <ToolButton label="Re-layout" onClick={onRelayout}>
          <LayoutGrid className="size-4" />
        </ToolButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolButton label="Search nodes (/)" onClick={onOpenSearch}>
          <Search className="size-4" />
        </ToolButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={traceMode}
              onPressedChange={onTraceModeChange}
              size="sm"
              aria-label="Flow trace mode"
              className="h-8 gap-1.5 px-2 font-mono text-[11px] uppercase tracking-wider data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              <RouteIcon className="size-3.5" />
              Trace
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom">Highlight a traced execution flow</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
          <Crosshair className="size-3" />
          {nodeCount} nodes · {edgeCount} edges
        </span>
        <ToolButton label={panelOpen ? "Hide details panel" : "Show details panel"} onClick={onPanelToggle}>
          {panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
        </ToolButton>
      </div>
    </div>
  );
}
