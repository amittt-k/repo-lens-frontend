import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import type { FilterState } from "@/components/repolens/RelationshipFilters";
import {
  mockFlows,
  mockGraphNodes,
  type NodeKind,
  type RelationKind,
} from "@/data/mock-repo";
import { allKinds, allRelations } from "@/lib/graph-tokens";

/**
 * Workspace state for the repo routes lives in the URL so a selection survives
 * Overview <-> Graph navigation and graph views stay shareable.
 *
 * Every field is optional and tolerant: unknown ids and unknown filter values
 * degrade to "nothing selected" / "everything visible" instead of throwing.
 */
export interface WorkspaceSearch {
  node?: string;
  flow?: string;
  kinds?: string;
  relations?: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function validateWorkspaceSearch(search: Record<string, unknown>): WorkspaceSearch {
  return {
    node: readString(search["node"]),
    flow: readString(search["flow"]),
    kinds: readString(search["kinds"]),
    relations: readString(search["relations"]),
  };
}

function decodeList<T extends string>(raw: string | undefined, allowed: T[]): T[] {
  if (raw === undefined) return allowed;
  const picked = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is T => (allowed as string[]).includes(part));
  return picked;
}

function encodeList<T extends string>(list: T[], allowed: T[]): string | undefined {
  // Omit the param entirely when nothing is filtered out, keeping URLs clean.
  if (list.length === allowed.length) return undefined;
  return list.join(",");
}

export function useWorkspaceState() {
  const search = useSearch({ from: "/repo/$owner/$name" });
  const navigate = useNavigate();

  const patch = useCallback(
    (next: WorkspaceSearch) => {
      void navigate({
        to: ".",
        search: (prev: WorkspaceSearch) => ({ ...prev, ...next }),
        replace: true,
      });
    },
    [navigate],
  );

  const nodesById = useMemo(
    () => Object.fromEntries(mockGraphNodes.map((n) => [n.id, n])),
    [],
  );

  const selectedId = search.node && nodesById[search.node] ? search.node : null;
  const selected = selectedId ? (nodesById[selectedId] ?? null) : null;

  const activeFlowId = search.flow && mockFlows.some((f) => f.id === search.flow) ? search.flow : null;
  const activeFlow = mockFlows.find((f) => f.id === activeFlowId) ?? null;

  const filters = useMemo<FilterState>(
    () => ({
      kinds: decodeList<NodeKind>(search.kinds, allKinds),
      relations: decodeList<RelationKind>(search.relations, allRelations),
    }),
    [search.kinds, search.relations],
  );

  const setSelectedId = useCallback(
    (id: string | null) => patch({ node: id ?? undefined }),
    [patch],
  );

  const setActiveFlowId = useCallback(
    (id: string | null) => patch({ flow: id ?? undefined }),
    [patch],
  );

  const setFilters = useCallback(
    (next: FilterState) =>
      patch({
        kinds: encodeList(next.kinds, allKinds),
        relations: encodeList(next.relations, allRelations),
      }),
    [patch],
  );

  const resetFilters = useCallback(
    () => patch({ kinds: undefined, relations: undefined }),
    [patch],
  );

  // Tracing is on exactly when a flow is active — there is no separate flag.
  const traceActive = activeFlowId !== null;
  const traceNodeIds = useMemo(
    () => activeFlow?.steps.map((s) => s.nodeId) ?? [],
    [activeFlow],
  );

  return {
    selectedId,
    selected,
    setSelectedId,
    activeFlowId,
    setActiveFlowId,
    traceActive,
    traceNodeIds,
    filters,
    setFilters,
    resetFilters,
    nodesById,
  };
}
