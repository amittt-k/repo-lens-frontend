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
  { icon: ScanSearch, title: "Point at a repo", body: "Paste a GitHub URL. RepoLens reads structure, not just files." },
  { icon: Network, title: "See the graph", body: "Modules, components and utilities laid out by how they actually depend on each other." },
  { icon: RouteIcon, title: "Trace a flow", body: "Follow one execution path across files instead of grep-hopping." },
  { icon: Sparkles, title: "Ask why", body: "Plain-language explanations of any node's role and blast radius." },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10">
              <Waypoints className="size-4 text-primary" />
            </div>
            <span className="truncate font-mono text-sm font-semibold tracking-tight">
              RepoLens
            </span>
            <MockBadge className="hidden sm:inline-flex" />
          </div>
          <nav className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/repo/$owner/$name" params={{ owner: mockRepo.owner, name: mockRepo.name }}>
                Demo workspace
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="hero-glow relative overflow-hidden border-b border-border">
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.18]" />
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              <GitBranch className="size-3.5" />
              static analysis · dependency graph
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Understand an unfamiliar repository
              <span className="block text-muted-foreground">before you touch a single line.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">
              RepoLens turns a GitHub URL into a navigable map: file structure, code relationships, an
              interactive graph, traced flows and explanations you can actually read.
            </p>
            <div className="mt-8">
              <RepoUrlForm />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            How it reads code
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <article key={s.title} className="panel-surface rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <s.icon className="size-4 text-primary" />
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] text-muted-foreground">
            RepoLens · static repository analysis engine
          </p>
          <p className="max-w-lg text-[11px] leading-relaxed text-muted-foreground/70">
            Powered by static JavaScript/TypeScript AST parsing, dependency resolution, symbol relationship extraction, and graph modeling.
          </p>
        </div>
      </footer>
    </div>
  );
}

