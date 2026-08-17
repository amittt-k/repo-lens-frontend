import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { mockGraphNodes, kindLabels } from "@/data/mock-repo";

export function SearchPalette({
  open,
  onOpenChange,
  onSelectNode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search files, modules and symbols…" />
      <CommandList>
        <CommandEmpty>No nodes match that query.</CommandEmpty>
        <CommandGroup heading="Nodes">
          {mockGraphNodes.map((node) => (
            <CommandItem
              key={node.id}
              value={`${node.label} ${node.path} ${node.exports.join(" ")}`}
              onSelect={() => {
                onSelectNode(node.id);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{node.label}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {node.path}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {kindLabels[node.kind]}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
