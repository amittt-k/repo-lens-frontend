import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { GitBranch, LayoutDashboard, Network, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RepoUrlForm } from "@/components/repolens/RepoUrlForm";
import { MockBadge } from "@/components/repolens/primitives";
import { validateWorkspaceSearch } from "@/hooks/useWorkspaceState";

export const Route = createFileRoute("/repo/$owner/$name")({
  // Workspace state (selection, flow, filters) lives in the URL so it survives
  // Overview <-> Graph navigation and stays shareable/reloadable.
  validateSearch: validateWorkspaceSearch,
  component: RepoLayout,
});

function RepoLayout() {
  const { owner, name } = Route.useParams();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
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
                search={(prev) => prev}
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
                search={(prev) => prev}
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
      <Outlet />
    </div>
  );
}
