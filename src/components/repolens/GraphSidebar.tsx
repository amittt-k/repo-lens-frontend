import type { FileNode } from "@/data/mock-repo";
import type { TracedFlow } from "@/utils/flowTracing";
import { FileExplorer } from "./FileExplorer";
import { FlowTracePanel } from "./FlowTracePanel";
import { PanelHeading } from "./primitives";
import { RelationshipFilters, type FilterState } from "./RelationshipFilters";

export interface GraphSidebarProps {
  tree: FileNode[];
  flows: TracedFlow[];
  activeFlow?: TracedFlow | null | undefined;
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
  activeFlow,
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
      <section className={`panel-surface flex ${explorerHeight} flex-col overflow-hidden rounded-md`}>
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
        activeFlow={activeFlow}
        activeFlowId={activeFlowId}
        onFlowChange={onFlowChange}
        onStepSelect={onSelectNode}
        selectedNodeId={selectedId}
      />
    </div>
  );
}
