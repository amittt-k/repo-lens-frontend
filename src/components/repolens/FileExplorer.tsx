import { ChevronRight, File, FolderClosed, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/data/mock-repo";
import { EmptyState, KindBadge } from "./primitives";

function filterTree(nodes: FileNode[], q: string): FileNode[] {
  if (!q) return nodes;
  const needle = q.toLowerCase();
  return nodes
    .map((node) => {
      if (node.type === "file") {
        return node.path.toLowerCase().includes(needle) ? node : null;
      }
      const children = filterTree(node.children ?? [], q);
      if (children.length || node.path.toLowerCase().includes(needle)) {
        return { ...node, children };
      }
      return null;
    })
    .filter((n): n is FileNode => n !== null);
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  forceOpen,
}: {
  node: FileNode;
  depth: number;
  selectedId: string | null | undefined;
  onSelect: (node: FileNode) => void;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isOpen = forceOpen || open;

  if (node.type === "dir") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          style={{ paddingLeft: depth * 12 + 8 }}
          aria-expanded={isOpen}
        >
          <ChevronRight
            className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-90")}
          />
          {isOpen ? (
            <FolderOpen className="size-3.5 shrink-0 text-node-module" />
          ) : (
            <FolderClosed className="size-3.5 shrink-0 text-node-module" />
          )}
          <span className="truncate font-mono text-xs">{node.name}</span>
        </button>
        {isOpen
          ? (node.children ?? []).map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                forceOpen={forceOpen}
              />
            ))
          : null}
      </div>
    );
  }

  const active = selectedId === node.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      style={{ paddingLeft: depth * 12 + 8 }}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md py-1.5 pr-2 text-left transition-colors",
        active ? "bg-primary/12 text-foreground" : "text-muted-foreground hover:bg-elevated hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <File className="size-3.5 shrink-0 opacity-60" />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </span>
      {node.loc ? (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
          {node.loc}
        </span>
      ) : null}
    </button>
  );
}

export interface FileExplorerProps {
  tree?: FileNode[] | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((node: FileNode) => void) | undefined;
  className?: string | undefined;
}

export function FileExplorer({
  tree = [],
  selectedId,
  onSelect,
  className,
}: FileExplorerProps) {
  const [query, setQuery] = useState("");
  const filteredTree = useMemo(() => filterTree(tree, query), [tree, query]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="border-b border-border p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          className="h-8 bg-background font-mono text-xs"
          aria-label="Filter files"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {filteredTree.length ? (
            filteredTree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={(n) => onSelect?.(n)}
                forceOpen={Boolean(query)}
              />
            ))
          ) : (
            <EmptyState
              title="No matching files"
              description="No files found matching that filter. Clear the search to see the full repository structure."
            />
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          structure
        </span>
        <KindBadge kind="module" />
      </div>
    </div>
  );
}
