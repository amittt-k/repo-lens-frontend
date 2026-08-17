import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NodeKind, RelationKind } from "@/data/mock-repo";
import { kindLabels } from "@/data/mock-repo";

const kindStyles: Record<NodeKind, string> = {
  module: "border-node-module/40 bg-node-module/10 text-node-module",
  component: "border-node-component/40 bg-node-component/10 text-node-component",
  function: "border-node-function/40 bg-node-function/10 text-node-function",
  external: "border-node-external/40 bg-node-external/10 text-node-external",
};

export function KindBadge({ kind, className }: { kind: NodeKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        kindStyles[kind],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {kindLabels[kind]}
    </span>
  );
}

const relationStyles: Record<RelationKind, string> = {
  import: "text-node-module",
  call: "text-node-function",
  export: "text-node-component",
};

export function RelationDot({ relation }: { relation: RelationKind }) {
  return <span className={cn("size-2 rounded-full bg-current", relationStyles[relation])} />;
}

export function PanelHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-10 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground">
        {icon ?? <Inbox className="size-4" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[38ch] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <div className="grid size-10 place-items-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[42ch] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="panel-surface rounded-lg px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function MockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-warning",
        className,
      )}
      title="Static fixture — no repository is fetched or analyzed."
    >
      mock data
    </span>
  );
}
