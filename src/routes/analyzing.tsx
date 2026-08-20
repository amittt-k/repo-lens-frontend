import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/repolens/primitives";
import { useAnalyzeRepository } from "@/hooks/useRepositoryData";

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

  const analyzeMutation = useAnalyzeRepository();
  const hasTriggeredRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  const targetUrl = customUrl || `https://github.com/${ownerParam}/${repoParam}`;

  // 1. Dispatch analysis mutation once on mount
  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    analyzeMutation.mutate(targetUrl);
  }, [targetUrl]);

  // 2. Advance stage indicator while mutation is actively in-flight
  useEffect(() => {
    if (!analyzeMutation.isPending) return;

    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 2));
    }, 450);

    return () => clearInterval(interval);
  }, [analyzeMutation.isPending]);

  // 3. Reactively handle successful mutation completion and immediately navigate
  useEffect(() => {
    if (!analyzeMutation.isSuccess || !analyzeMutation.data || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    setStage(STAGES.length);
    const repository = analyzeMutation.data.repository;
    const targetOwner = repository?.owner || ownerParam;
    const targetName = repository?.name || repoParam;
    const targetRepoId = repository?.id;

    void navigate({
      to: "/repo/$owner/$name",
      params: { owner: targetOwner, name: targetName },
      search: { repoId: targetRepoId },
    });
  }, [analyzeMutation.isSuccess, analyzeMutation.data, ownerParam, repoParam, navigate]);

  // 4. Reactively derive error state from mutation failure
  const errorMessage = analyzeMutation.isError
    ? analyzeMutation.error?.message || "Failed to analyze repository."
    : null;

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
              {ownerParam}/{repoParam}
            </span>
          </div>
        </div>

        {errorMessage ? (
          <ErrorState
            title="Analysis could not complete"
            description={errorMessage}
            onRetry={() => navigate({ to: "/" })}
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
              Executing static analysis pipeline: AST extraction, dependency resolution, symbol relationships, and graph construction.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

