import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { GraphNodeData } from "@/data/mock-repo";
import { kindLabels } from "@/data/mock-repo";

export interface SearchPaletteProps {
  nodes?: GraphNodeData[] | undefined;
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
      <CommandInput placeholder="Search files, modules and symbols…" />
      <CommandList>
        <CommandEmpty>No nodes match that query.</CommandEmpty>
        <CommandGroup heading="Nodes">
          {nodes.map((node) => {
            const isVisible = visibleIds
              ? visibleIds instanceof Set
                ? visibleIds.has(node.id)
                : visibleIds.includes(node.id)
              : true;

            return (
              <CommandItem
                key={node.id}
                value={`${node.label} ${node.path} ${node.exports.join(" ")}`}
                disabled={!isVisible}
                onSelect={() => {
                  if (!isVisible) return;
                  onSelectNode(node.id);
                  onOpenChange(false);
                }}
                className={cn("gap-2", !isVisible && "opacity-50 cursor-not-allowed")}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "block truncate font-mono text-xs",
                        isVisible ? "text-foreground" : "text-muted-foreground line-through",
                      )}
                    >
                      {node.label}
                    </span>
                    {!isVisible ? (
                      <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        Filtered out
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">
                    {node.path}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {kindLabels[node.kind]}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
