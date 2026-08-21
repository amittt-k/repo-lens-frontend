import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getKindTokens, getRelationTokens } from "@/lib/graph-tokens";

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  const tokens = getKindTokens(kind);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider border",
        tokens.badge,
        className,
      )}
    >
      <span className="size-1 rounded-full bg-current opacity-80" />
      {tokens.label}
    </span>
  );
}

export function RelationDot({ relation }: { relation: string }) {
  const tokens = getRelationTokens(relation);
  return <span className={cn("size-1.5 rounded-full bg-current shrink-0", tokens.text)} />;
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface/50 px-3.5 py-2.5 min-w-0 overflow-hidden">
      <div className="min-w-0 overflow-hidden">
        <Heading className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          {title}
        </Heading>
        {hint ? (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={hint}>
            {hint}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
        "flex flex-col items-center justify-center gap-2.5 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="grid size-8 place-items-center rounded border border-border bg-elevated text-muted-foreground">
        {icon ?? <Inbox className="size-3.5" />}
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[36ch] text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
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
        "flex flex-col items-center justify-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <div className="grid size-8 place-items-center rounded border border-destructive/40 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[40ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="h-7 text-xs">
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
    <div className="panel-surface rounded-md px-3.5 py-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function MockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning font-medium",
        className,
      )}
      title="Static fixture — no live repository is fetched."
    >
      demo fixture
    </span>
  );
}
