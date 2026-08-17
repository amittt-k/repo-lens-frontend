import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { NodeKind, RelationKind } from "@/data/mock-repo";
import { kindLabels, relationLabels } from "@/data/mock-repo";
import { PanelHeading, RelationDot } from "./primitives";

export interface FilterState {
  relations: RelationKind[];
  kinds: NodeKind[];
}

export const allRelations: RelationKind[] = ["import", "call", "export"];
export const allKinds: NodeKind[] = ["module", "component", "function", "external"];

export function RelationshipFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  function toggle<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  }

  return (
    <section className="panel-surface overflow-hidden rounded-lg">
      <PanelHeading title="Relationships" hint="Filter what the graph draws" />
      <div className="space-y-4 p-4">
        <div className="space-y-2.5">
          {allRelations.map((relation) => (
            <div key={relation} className="flex items-center gap-2.5">
              <Checkbox
                id={`rel-${relation}`}
                checked={value.relations.includes(relation)}
                onCheckedChange={() =>
                  onChange({ ...value, relations: toggle(value.relations, relation) })
                }
              />
              <Label
                htmlFor={`rel-${relation}`}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-xs font-normal text-muted-foreground"
              >
                <RelationDot relation={relation} />
                <span className="truncate">{relationLabels[relation]}</span>
              </Label>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Node type
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {allKinds.map((kind) => (
              <div key={kind} className="flex items-center gap-2.5">
                <Checkbox
                  id={`kind-${kind}`}
                  checked={value.kinds.includes(kind)}
                  onCheckedChange={() => onChange({ ...value, kinds: toggle(value.kinds, kind) })}
                />
                <Label
                  htmlFor={`kind-${kind}`}
                  className="cursor-pointer truncate text-xs font-normal text-muted-foreground"
                >
                  {kindLabels[kind]}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
