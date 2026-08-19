import type { RelationKind, RepoSummary } from "@/data/mock-repo";
import { relationLabels } from "@/data/mock-repo";
import { PanelHeading } from "./primitives";

export interface CompositionPanelProps {
  repo: RepoSummary;
  relationCounts: { relation: RelationKind; count: number }[];
  className?: string | undefined;
}

export function CompositionPanel({ repo, relationCounts, className }: CompositionPanelProps) {
  return (
    <section className={className ? className : "panel-surface overflow-hidden rounded-lg"}>
      <PanelHeading title="Composition" hint="Language and relationship mix" />
      <div className="space-y-4 p-4">
        <div className="space-y-2.5">
          {repo.languages.map((lang) => (
            <div key={lang.name}>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="truncate text-muted-foreground">{lang.name}</span>
                <span className="tabular-nums text-muted-foreground">{lang.share}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${lang.share}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          {relationCounts.map((r) => (
            <div key={r.relation} className="rounded-md border border-border bg-background/40 px-2 py-2">
              <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {relationLabels[r.relation]}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{r.count}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
