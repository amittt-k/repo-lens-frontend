import type { FileNode, RepoFlow } from "@/data/mock-repo";
import { FileExplorer } from "./FileExplorer";
import { FlowTracePanel } from "./FlowTracePanel";
import { PanelHeading } from "./primitives";
import { RelationshipFilters, type FilterState } from "./RelationshipFilters";

export interface GraphSidebarProps {
  tree: FileNode[];
  flows: RepoFlow[];
  selectedId: string | null;
  onSelectNode: (nodeId: string) => void;
  activeFlowId: string | null;
  onFlowChange: (flowId: string | null) => void;
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  className?: string | undefined;
  explorerHeight?: string | undefined;
}

export function GraphSidebar({
  tree,
  flows,
  selectedId,
  onSelectNode,
  activeFlowId,
  onFlowChange,
  filters,
  onFiltersChange,
  className = "space-y-3",
  explorerHeight = "h-[300px]",
}: GraphSidebarProps) {
  return (
    <div className={className}>
      <section className={`panel-surface flex ${explorerHeight} flex-col overflow-hidden rounded-lg`}>
        <PanelHeading title="Explorer" hint="Click a file to select its node" />
        <FileExplorer
          tree={tree}
          selectedId={selectedId}
          onSelect={(node) => onSelectNode(node.id)}
          className="flex-1"
        />
      </section>
      <RelationshipFilters value={filters} onChange={onFiltersChange} />
      <FlowTracePanel
        flows={flows}
        activeFlowId={activeFlowId}
        onFlowChange={onFlowChange}
        onStepSelect={onSelectNode}
        selectedNodeId={selectedId}
      />
    </div>
  );
}
