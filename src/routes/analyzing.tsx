import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ErrorState, MockBadge } from "@/components/repolens/primitives";

const searchSchema = z.object({
  owner: z.string().default("vercel"),
  repo: z.string().default("commerce-kit"),
  /** `?fail=1` renders the analysis error state for UI review. */
  fail: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/analyzing")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Analyzing repository — RepoLens" },
      { name: "description", content: "RepoLens is mapping the repository structure and code relationships." },
      { property: "og:title", content: "Analyzing repository — RepoLens" },
      { property: "og:description", content: "Repository structure and relationship mapping in progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Analyzing,
});

const STAGES = [
  "Resolving repository metadata",
  "Reading file & folder structure",
  "Extracting code relationships",
  "Building dependency graph",
  "Preparing workspace",
];

function Analyzing() {
  const { owner, repo, fail } = Route.useSearch();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (fail) return;
    if (stage >= STAGES.length) {
      const t = setTimeout(
        () => navigate({ to: "/repo/$owner/$name", params: { owner, name: repo } }),
        350,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [stage, fail, navigate, owner, repo]);

  const pct = Math.round((Math.min(stage, STAGES.length) / STAGES.length) * 100);

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10">
              <Waypoints className="size-4 text-primary" />
            </div>
            <span className="truncate font-mono text-sm">
              {owner}/{repo}
            </span>
          </div>
          <MockBadge />
        </div>

        {fail ? (
          <ErrorState
            title="Analysis could not complete"
            description="This is the error state placeholder. In the real product it covers private repositories, rate limits and unsupported languages."
            onRetry={() => navigate({ to: "/", search: {} })}
            retryLabel="Back to start"
          />
        ) : (
          <div className="panel-surface scan-line rounded-xl p-5">
            <Progress value={pct} className="h-1" />
            <ol className="mt-5 space-y-2.5">
              {STAGES.map((label, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li key={label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border",
                        done
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : active
                            ? "border-primary/40 text-primary"
                            : "border-border text-muted-foreground/40",
                      )}
                    >
                      {done ? (
                        <Check className="size-3" />
                      ) : active ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-xs",
                        done || active ? "text-foreground" : "text-muted-foreground/50",
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Loading state only — the sequence is timed in the UI, no repository is being read.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => navigate({ to: "/analyzing", search: { owner, repo, fail: true } })}
            >
              Preview error state
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
