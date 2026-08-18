import type { NodeKind, RelationKind } from "@/data/mock-repo";

/**
 * Single source of truth for graph colour tokens. Badges, canvas nodes and
 * edges all read from here so a kind/relation colour is defined once.
 */
export interface KindTokens {
  /** Badge / pill styling (border + tint + text). */
  badge: string;
  /** Canvas node border styling. */
  border: string;
  /** Foreground colour for icons and labels. */
  text: string;
  /** Raw CSS variable, for SVG strokes and inline styles. */
  cssVar: string;
}

export const kindTokens: Record<NodeKind, KindTokens> = {
  module: {
    badge: "border-node-module/40 bg-node-module/10 text-node-module",
    border: "border-node-module/50",
    text: "text-node-module",
    cssVar: "var(--color-node-module)",
  },
  component: {
    badge: "border-node-component/40 bg-node-component/10 text-node-component",
    border: "border-node-component/50",
    text: "text-node-component",
    cssVar: "var(--color-node-component)",
  },
  function: {
    badge: "border-node-function/40 bg-node-function/10 text-node-function",
    border: "border-node-function/50",
    text: "text-node-function",
    cssVar: "var(--color-node-function)",
  },
  external: {
    badge: "border-node-external/40 bg-node-external/10 text-node-external",
    border: "border-node-external/50 border-dashed",
    text: "text-node-external",
    cssVar: "var(--color-node-external)",
  },
};

export interface RelationTokens {
  text: string;
  cssVar: string;
}

export const relationTokens: Record<RelationKind, RelationTokens> = {
  import: { text: "text-node-module", cssVar: "var(--color-node-module)" },
  call: { text: "text-node-function", cssVar: "var(--color-node-function)" },
  export: { text: "text-node-component", cssVar: "var(--color-node-component)" },
};

export const allKinds = Object.keys(kindTokens) as NodeKind[];
export const allRelations = Object.keys(relationTokens) as RelationKind[];
