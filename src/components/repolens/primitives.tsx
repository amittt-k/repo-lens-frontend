import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NodeKind, RelationKind } from "@/data/mock-repo";
import { kindLabels } from "@/data/mock-repo";
import { kindTokens, relationTokens } from "@/lib/graph-tokens";

import { getKindTokens, getRelationTokens } from "@/lib/graph-tokens";

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  const tokens = getKindTokens(kind);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        tokens.badge,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {tokens.label}
    </span>
  );
}

export function RelationDot({ relation }: { relation: string }) {
  const tokens = getRelationTokens(relation);
  return <span className={cn("size-2 rounded-full bg-current", tokens.text)} />;
}


export function PanelHeading({
  title,
  hint,
  action,
  as: Heading = "h3",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Heading level for the document outline. Panels default to h3. */
  as?: "h2" | "h3";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <Heading className="truncate font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </Heading>
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
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
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
      {action}
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
