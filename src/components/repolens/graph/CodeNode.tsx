import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Component, FileCode2, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NodeKind } from "@/data/mock-repo";
import { kindTokens } from "@/lib/graph-tokens";

export interface CodeNodePayload extends Record<string, unknown> {
  label: string;
  path: string;
  kind: NodeKind;
  loc: number;
  inTrace: boolean;
  dimmed: boolean;
}

const icons: Record<NodeKind, typeof Box> = {
  module: Box,
  component: Component,
  function: FileCode2,
  external: Package,
};

export function CodeNode({ data, selected }: NodeProps) {
  const payload = data as CodeNodePayload;
  const Icon = icons[payload.kind];

  return (
    <div
      className={cn(
        "w-[200px] rounded-lg border bg-surface px-3 py-2.5 transition-opacity",
        kindTokens[payload.kind].border,
        selected && "focus-glow",
        payload.inTrace && "border-primary/70 bg-primary/10",
        payload.dimmed && "opacity-25",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("size-3.5 shrink-0", kindTokens[payload.kind].text)} />
        <span className="truncate font-mono text-xs text-foreground">{payload.label}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{payload.path}</p>
      {payload.loc ? (
        <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
          {payload.loc} loc
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
