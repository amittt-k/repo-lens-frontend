/**
 * Single source of truth for graph colour tokens, labels, and styles.
 * Badges, canvas nodes, filters, and edges read from here.
 */

export type NodeKind =
  | "file"
  | "function"
  | "class"
  | "method"
  | "component"
  | "type"
  | "variable"
  | "api_route"
  | "package"
  // Backward compatibility alias
  | "module"
  | "external";

export type RelationKind =
  | "IMPORTS"
  | "CONTAINS"
  | "CALLS"
  | "USES"
  | "EXTENDS"
  | "IMPLEMENTS"
  | "HANDLES_ROUTE"
  | "CALLS_API"
  // Lowercase compatibility aliases
  | "import"
  | "call"
  | "export";

export interface KindTokens {
  badge: string;
  border: string;
  text: string;
  cssVar: string;
  label: string;
}

export const kindTokens: Record<string, KindTokens> = {
  file: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    border: "border-sky-500/40",
    text: "text-sky-400",
    cssVar: "oklch(0.72 0.12 230)",
    label: "File",
  },
  module: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    border: "border-sky-500/40",
    text: "text-sky-400",
    cssVar: "oklch(0.72 0.12 230)",
    label: "Module",
  },
  component: {
    badge: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    border: "border-purple-500/40",
    text: "text-purple-400",
    cssVar: "oklch(0.76 0.14 310)",
    label: "Component",
  },
  function: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    cssVar: "oklch(0.80 0.14 150)",
    label: "Function",
  },
  class: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    border: "border-amber-500/40",
    text: "text-amber-400",
    cssVar: "oklch(0.80 0.14 80)",
    label: "Class",
  },
  method: {
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-300",
    border: "border-teal-500/40",
    text: "text-teal-400",
    cssVar: "oklch(0.78 0.13 175)",
    label: "Method",
  },
  type: {
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
    border: "border-indigo-500/40",
    text: "text-indigo-400",
    cssVar: "oklch(0.74 0.14 275)",
    label: "Type",
  },
  variable: {
    badge: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    border: "border-slate-500/40",
    text: "text-slate-400",
    cssVar: "oklch(0.70 0.03 260)",
    label: "Variable",
  },
  api_route: {
    badge: "border-pink-500/30 bg-pink-500/10 text-pink-300",
    border: "border-pink-500/40",
    text: "text-pink-400",
    cssVar: "oklch(0.75 0.16 350)",
    label: "API Route",
  },
  package: {
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    border: "border-orange-500/40 border-dashed",
    text: "text-orange-400",
    cssVar: "oklch(0.75 0.15 50)",
    label: "Package",
  },
  external: {
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    border: "border-orange-500/40 border-dashed",
    text: "text-orange-400",
    cssVar: "oklch(0.75 0.15 50)",
    label: "Package",
  },
};

export interface RelationTokens {
  text: string;
  cssVar: string;
  label: string;
  dash?: string;
}

export const relationTokens: Record<string, RelationTokens> = {
  IMPORTS: {
    text: "text-sky-400",
    cssVar: "oklch(0.72 0.12 230)",
    label: "Imports",
  },
  CONTAINS: {
    text: "text-slate-400",
    cssVar: "oklch(0.55 0.02 260)",
    label: "Contains",
    dash: "4 4",
  },
  CALLS: {
    text: "text-emerald-400",
    cssVar: "oklch(0.80 0.14 150)",
    label: "Calls",
  },
  USES: {
    text: "text-amber-400",
    cssVar: "oklch(0.80 0.14 80)",
    label: "Uses",
  },
  EXTENDS: {
    text: "text-purple-400",
    cssVar: "oklch(0.76 0.14 310)",
    label: "Extends",
    dash: "6 3",
  },
  IMPLEMENTS: {
    text: "text-indigo-400",
    cssVar: "oklch(0.74 0.14 275)",
    label: "Implements",
    dash: "3 3",
  },
  HANDLES_ROUTE: {
    text: "text-pink-400",
    cssVar: "oklch(0.75 0.16 350)",
    label: "Handles Route",
  },
  CALLS_API: {
    text: "text-cyan-400",
    cssVar: "oklch(0.78 0.13 190)",
    label: "Calls API",
  },
  // Compatibility aliases
  import: {
    text: "text-sky-400",
    cssVar: "oklch(0.72 0.12 230)",
    label: "Imports",
  },
  call: {
    text: "text-emerald-400",
    cssVar: "oklch(0.80 0.14 150)",
    label: "Calls",
  },
  export: {
    text: "text-purple-400",
    cssVar: "oklch(0.76 0.14 310)",
    label: "Exports",
    dash: "4 3",
  },
};

export const allKinds: NodeKind[] = [
  "file",
  "function",
  "class",
  "method",
  "component",
  "type",
  "variable",
  "api_route",
  "package",
];

export const allRelations: RelationKind[] = [
  "IMPORTS",
  "CONTAINS",
  "CALLS",
  "USES",
  "EXTENDS",
  "IMPLEMENTS",
  "HANDLES_ROUTE",
  "CALLS_API",
];

export function getKindTokens(kind: string | undefined): KindTokens {
  const normalized = (kind || "file").toLowerCase();
  return kindTokens[normalized] || kindTokens["file"]!;
}

export function getRelationTokens(relation: string | undefined): RelationTokens {
  const normalized = relation || "IMPORTS";
  return relationTokens[normalized] || relationTokens[normalized.toUpperCase()] || relationTokens["IMPORTS"]!;
}
