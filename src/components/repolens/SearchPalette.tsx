import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getKindTokens } from "@/lib/graph-tokens";

export interface SearchNodeItem {
  id: string;
  label: string;
  path?: string;
  kind?: string;
  exports?: string[];
}

export interface SearchPaletteProps {
  nodes?: SearchNodeItem[] | undefined;
  visibleIds?: Set<string> | string[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNode: (nodeId: string) => void;
}

export function SearchPalette({
  nodes = [],
  visibleIds,
  open,
  onOpenChange,
  onSelectNode,
}: SearchPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search files, functions, classes and routes (type to filter)…" className="font-mono text-xs" />
      <CommandList className="max-h-80">
        <CommandEmpty className="py-6 text-center font-mono text-xs text-muted-foreground">
          No nodes match that query.
        </CommandEmpty>
        <CommandGroup heading="Graph Nodes" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {nodes.map((node) => {
            const isVisible = visibleIds
              ? visibleIds instanceof Set
                ? visibleIds.has(node.id)
                : visibleIds.includes(node.id)
              : true;

            const tokens = getKindTokens(node.kind);
            const exportText = (node.exports || []).join(" ");
            const searchValue = `${node.label} ${node.path || ""} ${tokens.label} ${exportText}`.trim();

            return (
              <CommandItem
                key={node.id}
                value={searchValue}
                disabled={!isVisible}
                onSelect={() => {
                  if (!isVisible) return;
                  onSelectNode(node.id);
                  onOpenChange(false);
                }}
                className={cn("gap-2 py-2 px-2.5 font-mono cursor-pointer", !isVisible && "opacity-40 cursor-not-allowed")}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "block truncate text-xs font-medium",
                        isVisible ? "text-foreground" : "text-muted-foreground line-through",
                      )}
                    >
                      {node.label}
                    </span>
                    {!isVisible ? (
                      <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] uppercase tracking-wider text-muted-foreground">
                        Filtered out
                      </span>
                    ) : null}
                  </span>
                  {node.path ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {node.path}
                    </span>
                  ) : null}
                </span>
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider shrink-0 border", tokens.badge)}>
                  {tokens.label}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
