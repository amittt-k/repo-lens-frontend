import type { GraphNodeData } from "@/data/mock-repo";
import { PanelHeading } from "./primitives";

export interface HotspotItem {
  node: GraphNodeData;
  degree: number;
}

export interface HotspotsPanelProps {
  hotspots: HotspotItem[];
  onSelectNode?: ((nodeId: string) => void) | undefined;
  className?: string | undefined;
}

export function HotspotsPanel({ hotspots, onSelectNode, className }: HotspotsPanelProps) {
  return (
    <section className={className ? className : "panel-surface overflow-hidden rounded-lg"}>
      <PanelHeading title="Hotspots" hint="Most depended-upon modules" />
      <ul className="divide-y divide-border">
        {hotspots.map(({ node, degree }) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onSelectNode?.(node.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-elevated cursor-pointer"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs text-foreground">
                  {node.label}
                </span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {node.path}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {degree} inbound
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
