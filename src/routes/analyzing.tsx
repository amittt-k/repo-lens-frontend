import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/repolens/primitives";
import { apiService } from "@/services/api.service";

const searchSchema = z.object({
  owner: z.string().default("vercel"),
  repo: z.string().default("commerce-kit"),
  url: z.string().optional(),
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
  "Validating & fetching repository",
  "Reading file structure & source code",
  "Extracting JavaScript/TypeScript AST symbols",
  "Resolving dependencies & imports",
  "Analyzing symbol relationships & API routes",
  "Building normalized graph",
];

export function Analyzing() {
  const { owner: ownerParam, repo: repoParam, url: customUrl } = Route.useSearch();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetUrl = customUrl || `https://github.com/${ownerParam}/${repoParam}`;

  useEffect(() => {
    let isCancelled = false;
    let timer: NodeJS.Timeout | null = null;

    // Advance stages smoothly while analysis is in-flight
    timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 2));
    }, 450);

    async function runAnalysis() {
      try {
        const result = await apiService.analyzeRepository(targetUrl);
        if (isCancelled) return;

        if (timer) clearInterval(timer);
        setStage(STAGES.length);

        const repository = result.repository;
        const targetOwner = repository?.owner || ownerParam;
        const targetName = repository?.name || repoParam;
        const targetRepoId = repository?.id;

        await navigate({
          to: "/repo/$owner/$name",
          params: { owner: targetOwner, name: targetName },
          search: { repoId: targetRepoId },
        });
      } catch (err: any) {
        if (isCancelled) return;
        if (timer) clearInterval(timer);
        setErrorMessage(err?.message || "Failed to analyze repository.");
      }
    }

    void runAnalysis();

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [targetUrl, ownerParam, repoParam, navigate]);

  const pct = Math.round((Math.min(stage, STAGES.length) / STAGES.length) * 100);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Terminal Header */}
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-6 place-items-center rounded border border-primary/40 bg-primary/10">
              <Waypoints className="size-3 text-primary" />
            </div>
            <span className="truncate font-mono text-xs font-semibold text-foreground">
              {ownerParam}/{repoParam}
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Analysis runner
          </span>
        </div>

        {errorMessage ? (
          <ErrorState
            title="Analysis could not complete"
            description={errorMessage}
            onRetry={() => navigate({ to: "/" })}
            retryLabel="Back to start"
          />
        ) : (
          <div className="panel-surface rounded-lg p-5">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span>Pipeline progress</span>
              <span className="tabular-nums text-foreground font-semibold">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1 bg-elevated" />

            <ol className="mt-5 space-y-2">
              {STAGES.map((label, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li key={label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        done
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : active
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border text-muted-foreground/30",
                      )}
                    >
                      {done ? (
                        <Check className="size-2.5" />
                      ) : active ? (
                        <Loader2 className="size-2.5 animate-spin" />
                      ) : (
                        <span className="size-1 rounded-full bg-current" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-xs",
                        done
                          ? "text-muted-foreground line-through decoration-muted-foreground/40"
                          : active
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/40",
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 border-t border-border pt-3">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                Running static AST parsing, relative import resolution, Express endpoint matching, and graph construction.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
