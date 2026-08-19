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
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="panel-surface max-w-md rounded-lg p-6 text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground">
          <Waypoints className="size-5 text-primary" />
        </div>
        <h1 className="font-mono text-base font-semibold text-foreground">Repository not found</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Could not find or load repository{" "}
          <code className="font-mono text-primary">
            {owner}/{name}
          </code>
          .
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild size="sm">
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="panel-surface max-w-md rounded-lg p-6 text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="font-mono text-base font-semibold text-foreground">Repository error</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          An error occurred while inspecting{" "}
          <code className="font-mono text-primary">
            {owner}/{name}
          </code>
          :
        </p>
        <p className="mt-2 rounded border border-border bg-background/50 p-2 font-mono text-[11px] text-destructive">
          {error.message || "Unknown error"}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild size="sm">
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
    <div className="flex min-h-screen flex-col lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link to="/" className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10">
              <Waypoints className="size-4 text-primary" />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-foreground">
                {owner}
                <span className="text-muted-foreground">/</span>
                {name}
              </p>
              <p className="flex items-center gap-1 truncate font-mono text-[10px] text-muted-foreground">
                <GitBranch className="size-3" /> main
              </p>
            </div>
            <MockBadge className="hidden md:inline-flex" />
          </div>

          <nav className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link
                to="/repo/$owner/$name"
                params={{ owner, name }}
                search={search}
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-elevated text-foreground" }}
              >
                <LayoutDashboard className="size-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link
                to="/repo/$owner/$name/graph"
                params={{ owner, name }}
                search={search}
                activeProps={{ className: "bg-elevated text-foreground" }}
              >
                <Network className="size-3.5" />
                <span className="hidden sm:inline">Graph</span>
              </Link>
            </Button>
            <div className="hidden lg:block">
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
