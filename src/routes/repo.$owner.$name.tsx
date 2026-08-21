import { createFileRoute, Link, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, GitBranch, LayoutDashboard, Network, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RepoUrlForm } from "@/components/repolens/RepoUrlForm";
import { MockBadge } from "@/components/repolens/primitives";
import { validateWorkspaceSearch } from "@/hooks/useWorkspaceState";

export const Route = createFileRoute("/repo/$owner/$name")({
  // Workspace state (selection, flow, filters) lives in the URL so it survives
  // Overview <-> Graph navigation and stays shareable/reloadable.
  validateSearch: validateWorkspaceSearch,
  errorComponent: RepoErrorComponent,
  notFoundComponent: RepoNotFoundComponent,
  component: RepoLayout,
});

function RepoNotFoundComponent() {
  const { owner, name } = Route.useParams();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="panel-surface max-w-md rounded-lg p-6 text-center">
        <div className="mx-auto mb-3 grid size-9 place-items-center rounded border border-border bg-elevated text-muted-foreground">
          <Waypoints className="size-4 text-primary" />
        </div>
        <h1 className="font-mono text-sm font-semibold text-foreground">Repository not found</h1>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          Could not find or load repository{" "}
          <code className="text-primary font-medium">
            {owner}/{name}
          </code>
          .
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild size="sm" className="h-8 text-xs font-mono">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RepoErrorComponent({ error, reset }: ErrorComponentProps) {
  const { owner, name } = Route.useParams();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="panel-surface max-w-md rounded-lg p-6 text-center">
        <div className="mx-auto mb-3 grid size-9 place-items-center rounded border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" />
        </div>
        <h1 className="font-mono text-sm font-semibold text-foreground">Repository error</h1>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          An error occurred while inspecting{" "}
          <code className="text-primary font-medium">
            {owner}/{name}
          </code>
          :
        </p>
        <p className="mt-2 rounded border border-border bg-background p-2.5 font-mono text-[11px] text-destructive">
          {error.message || "Unknown error"}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={reset} className="h-8 text-xs font-mono">
            Try again
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-mono">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RepoLayout() {
  const { owner, name } = Route.useParams();
  // Carry workspace search params across the Overview/Graph tabs.
  const search = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to="/"
              className="grid size-6 shrink-0 place-items-center rounded border border-primary/40 bg-primary/10 transition-colors hover:bg-primary/20"
              title="RepoLens Home"
            >
              <Waypoints className="size-3.5 text-primary" />
            </Link>
            <div className="min-w-0 flex items-center gap-1.5 font-mono text-xs">
              <span className="text-muted-foreground font-normal">{owner}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground truncate">{name}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-muted-foreground border-l border-border pl-2.5">
              <GitBranch className="size-3" />
              <span>main</span>
            </div>
            {!search.repoId ? <MockBadge className="hidden md:inline-flex" /> : null}
          </div>

          <nav className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded border border-border bg-background/60 p-0.5">
              <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-mono gap-1.5 rounded-sm">
                <Link
                  to="/repo/$owner/$name"
                  params={{ owner, name }}
                  search={search}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "bg-elevated text-foreground font-medium" }}
                >
                  <LayoutDashboard className="size-3" />
                  <span>Overview</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-mono gap-1.5 rounded-sm">
                <Link
                  to="/repo/$owner/$name/graph"
                  params={{ owner, name }}
                  search={search}
                  activeProps={{ className: "bg-elevated text-foreground font-medium" }}
                >
                  <Network className="size-3" />
                  <span>Graph</span>
                </Link>
              </Button>
            </div>
            <div className="hidden lg:block ml-2">
              <RepoUrlForm compact />
            </div>
          </nav>
        </div>
      </header>

      {/* Required: nested repo routes render here. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
