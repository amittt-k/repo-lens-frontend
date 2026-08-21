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
        "w-[220px] cursor-pointer rounded-md border bg-surface/95 px-3 py-2 shadow-sm transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
        tokens.border,
        selected && "border-primary ring-1 ring-primary bg-primary/10 shadow-sm shadow-primary/15",
        payload.inHighlight && !selected && "border-primary/60 ring-1 ring-primary/40 bg-primary/5",
        payload.inTrace && "border-primary/80 bg-primary/10",
        payload.dimmed && "opacity-20 pointer-events-auto",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-border !bg-muted-foreground" />
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className={cn("size-3.5 shrink-0", tokens.text)} />
          <span className="truncate font-mono text-xs font-semibold text-foreground">{payload.label}</span>
        </div>
        <span className={cn("rounded px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider shrink-0", tokens.badge)}>
          {tokens.label}
        </span>
      </div>
      {payload.path ? (
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{payload.path}</p>
      ) : null}
      {payload.loc ? (
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
          {payload.loc} LOC
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!size-2 !border-border !bg-muted-foreground" />
    </div>
  );
}
