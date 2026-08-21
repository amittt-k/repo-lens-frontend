import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GitBranch,
  Network,
  Route as RouteIcon,
  ScanSearch,
  Sparkles,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { RepoUrlForm } from "@/components/repolens/RepoUrlForm";
import { MockBadge } from "@/components/repolens/primitives";
import { mockRepo } from "@/data/mock-repo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RepoLens — Read unfamiliar codebases as a graph" },
      {
        name: "description",
        content:
          "RepoLens maps a GitHub repository into an interactive dependency graph with file structure, flow tracing and plain-language explanations.",
      },
      { property: "og:title", content: "RepoLens — Read unfamiliar codebases as a graph" },
      {
        property: "og:description",
        content:
          "Map any repository into an interactive dependency graph with flow tracing and plain-language explanations.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: ScanSearch,
    title: "1. Ingest & Parse",
    body: "Extract AST symbols, components, functions, classes, and types from JavaScript & TypeScript source files.",
  },
  {
    icon: Network,
    title: "2. Map Relationships",
    body: "Resolve module imports, call graphs, JSX component usage, class extensions, and Express API routes.",
  },
  {
    icon: RouteIcon,
    title: "3. Trace Flows",
    body: "Follow deterministic execution chains from entry points, routes, and components without manual grepping.",
  },
  {
    icon: Sparkles,
    title: "4. Grounded AI",
    body: "Generate technical architectural overviews and blast-radius summaries grounded strictly in extracted code facts.",
  },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-6 place-items-center rounded border border-primary/40 bg-primary/10">
              <Waypoints className="size-3.5 text-primary" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">
              RepoLens
            </span>
            <MockBadge className="hidden sm:inline-flex" />
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground">
              <Link to="/repo/$owner/$name" params={{ owner: mockRepo.owner, name: mockRepo.name }}>
                Demo Workspace
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border hero-glow">
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.12]" />
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded border border-border bg-surface px-2.5 py-1 font-mono text-[11px] font-medium text-primary">
              <GitBranch className="size-3" />
              <span>STATIC ARCHITECTURE ENGINE</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
              Understand unfamiliar codebases
              <span className="block text-muted-foreground font-normal">before touching a single line.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              RepoLens statically parses public GitHub repositories to generate interactive dependency graphs,
              symbol relationships, deterministic execution flows, and grounded code explanations.
            </p>

            <div className="mt-8 max-w-2xl">
              <RepoUrlForm />
            </div>
          </div>
        </section>

        {/* Pipeline / How It Reads Code */}
        <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Analysis Pipeline
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground/60">
              JS · TS · JSX · TSX
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 divide-y divide-border border border-border rounded-lg bg-surface sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            {steps.map((s, i) => (
              <article key={s.title} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="grid size-7 place-items-center rounded border border-border bg-elevated text-primary">
                    <s.icon className="size-3.5" />
                  </div>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground/50">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/30">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] text-muted-foreground">
            RepoLens · Static Architecture Analysis & Code Understanding
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            Powered by Babel AST, Express Route Discovery & Deterministic Flow Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
