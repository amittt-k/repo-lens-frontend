import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Binary,
  Box,
  Component,
  FileCode,
  FileCode2,
  Layers,
  Package,
  Route,
  Terminal,
  Variable,
} from "lucide-react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import { getKindTokens } from "@/lib/graph-tokens";

export interface CodeNodePayload extends Record<string, unknown> {
  label: string;
  path: string;
  kind: string;
  loc?: number;
  inTrace?: boolean;
  inHighlight?: boolean;
  dimmed?: boolean;
}

const kindIcons: Record<string, any> = {
  file: FileCode,
  module: Box,
  component: Component,
  function: FileCode2,
  class: Layers,
  method: Terminal,
  type: Binary,
  variable: Variable,
  api_route: Route,
  package: Package,
  external: Package,
};

export function CodeNode({ data, selected }: NodeProps) {
  const payload = data as CodeNodePayload;
  const kind = (payload.kind || "file").toLowerCase();
  const Icon = kindIcons[kind] || Box;
  const tokens = getKindTokens(kind);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`${payload.label} (${tokens.label})`}
      aria-selected={selected}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-[220px] cursor-pointer rounded-lg border bg-surface/95 px-3 py-2.5 shadow-sm transition-all backdrop-blur-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        tokens.border,
        selected && "ring-2 ring-primary border-primary bg-primary/10 shadow-md shadow-primary/20",
        payload.inHighlight && !selected && "ring-1 ring-primary/60 border-primary/70 bg-primary/5",
        payload.inTrace && "border-primary/70 bg-primary/10",
        payload.dimmed && "opacity-20 pointer-events-auto",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-border !bg-muted-foreground" />
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn("size-3.5 shrink-0", tokens.text)} />
          <span className="truncate font-mono text-xs font-medium text-foreground">{payload.label}</span>
        </div>
        <span className={cn("rounded px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider shrink-0", tokens.badge)}>
          {tokens.label}
        </span>
      </div>
      {payload.path ? (
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{payload.path}</p>
      ) : null}
      {payload.loc ? (
        <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/70">
          {payload.loc} LOC
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!size-2 !border-border !bg-muted-foreground" />
    </div>
  );
}
