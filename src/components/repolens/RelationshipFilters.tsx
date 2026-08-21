import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  allKinds,
  allRelations,
  kindTokens,
  relationTokens,
} from "@/lib/graph-tokens";
import { PanelHeading } from "./primitives";

export interface FilterState {
  relations: string[];
  kinds: string[];
}

export function RelationshipFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  function toggle(list: string[], item: string): string[] {
    const norm = (s: string) => s.toUpperCase();
    const itemNorm = norm(item);
    const has = list.some((i) => norm(i) === itemNorm);
    return has ? list.filter((i) => norm(i) !== itemNorm) : [...list, item];
  }

  function toggleKind(list: string[], item: string): string[] {
    const norm = (s: string) => s.toLowerCase();
    const itemNorm = norm(item);
    const has = list.some((i) => norm(i) === itemNorm);
    return has ? list.filter((i) => norm(i) !== itemNorm) : [...list, item];
  }

  return (
    <section className="panel-surface overflow-hidden rounded-md">
      <PanelHeading title="Edge & Node Filters" hint="Toggle visibility on graph canvas" />
      <div className="space-y-3.5 p-3">
        <div>
          <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Relationships ({value.relations.length}/{allRelations.length})
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {allRelations.map((relation) => {
              const token = relationTokens[relation]!;
              const checked = value.relations.some((r) => r.toUpperCase() === relation.toUpperCase());
              return (
                <div key={relation} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`rel-${relation}`}
                    checked={checked}
                    onCheckedChange={() =>
                      onChange({ ...value, relations: toggle(value.relations, relation) })
                    }
                    className="size-3.5 rounded-xs"
                  />
                  <Label
                    htmlFor={`rel-${relation}`}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 font-mono text-[11px] font-normal text-muted-foreground hover:text-foreground"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: token.cssVar }}
                    />
                    <span className="truncate">{token.label}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-2.5">
          <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Node Kinds ({value.kinds.length}/{allKinds.length})
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {allKinds.map((kind) => {
              const token = kindTokens[kind]!;
              const checked = value.kinds.some((k) => k.toLowerCase() === kind.toLowerCase());
              return (
                <div key={kind} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`kind-${kind}`}
                    checked={checked}
                    onCheckedChange={() =>
                      onChange({ ...value, kinds: toggleKind(value.kinds, kind) })
                    }
                    className="size-3.5 rounded-xs"
                  />
                  <Label
                    htmlFor={`kind-${kind}`}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 font-mono text-[11px] font-normal text-muted-foreground hover:text-foreground"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: token.cssVar }}
                    />
                    <span className="truncate">{token.label}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
