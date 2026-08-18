# RepoLens Remediation Plan — CRITICAL, HIGH, MEDIUM

Scope: fix findings 1–14 from the review. No new features, no backend, no redesign, same routes and visual language. LOW findings (15–20) are explicitly out of scope.

## Group A — Shared foundations (do first)

Everything else depends on these, and each is a pure move with no behaviour change.

**A1. Graph token module (finding 11)**
- New: `src/lib/graph-tokens.ts` — one `kindTokens: Record<NodeKind, {border,text,tint,cssVar}>` and one `relationTokens: Record<Relation, …>`.
- Edit: `src/components/repolens/primitives.tsx` (`kindStyles`, `relationStyles`), `graph/CodeNode.tsx` (`ring`, `tint`), `graph/GraphCanvas.tsx` (`edgeColor`) to read from it.
- Risk: colour drift if the four current maps disagree; reconcile by keeping the values currently rendered on canvas.

**A2. Domain constants (supporting 5 and 6)**
- Move `allKinds` / `allRelations` out of `RelationshipFilters.tsx` into `src/data/mock-repo.ts` (or `graph-tokens.ts`) so routes can derive filters without importing a component.

**A3. Heading-level prop (finding 12)**
- `PanelHeading` gains `as?: "h2" | "h3"`, default `h3`.
- Risk: existing panels shift from h2 → h3; intended, verify no styling keyed on tag.

## Group B — Workspace state model

**B1. Single source of truth in the layout (findings 3, 5)**
- Edit `src/routes/repo.$owner.$name.tsx`: add validated search params `{ node?: string; flow?: string; filters?… }` (or layout route context + provider) exposing `selectedId`, `activeFlowId`, filter state, and setters.
- `traceMode` is deleted as independent state: tracing is on iff `activeFlowId !== null`. `GraphToolbar` receives `activeFlowId` + `onToggleTrace` that sets/clears the id.
- Edit `repo.$owner.$name.index.tsx` and `repo.$owner.$name.graph.tsx` to consume the shared state; remove their local `useState` and the hardcoded `"n-cart-store"` seed (fall back to the first node only when nothing is selected).
- Behaviour changes (intended): selection survives Overview ↔ Graph navigation; graph URL becomes shareable/reloadable; Trace can no longer be "on with nothing highlighted".
- Risk: search-param validation must tolerate stale/unknown ids — unknown id resolves to no selection rather than throwing.

**B2. Props instead of fixture imports (finding 4)**
- Edit `NodeDetailsPanel.tsx` (drop `mockGraphNodes` from `EdgeRow`, pass a `nodesById` lookup), `FileExplorer.tsx` (`tree` prop), `SearchPalette.tsx` (`nodes` prop), `FlowTracePanel.tsx` (`flows` prop).
- The only `@/data/mock-repo` imports left are the two route files and the layout.
- Depends on B1 for where data is sourced. Risk: prop-drilling churn; keep prop names aligned with the data types.

## Group C — Graph canvas correctness

**C1. Draggable + keyboard-reachable nodes (finding 1)**
- `GraphCanvas.tsx`: adopt `useNodesState` / `useEdgesState`, seed from props, re-sync in an effect when the incoming node/edge ids change (preserve existing positions for nodes that persist), wire `onNodesChange` / `onEdgesChange`.
- `CodeNode.tsx`: focusable wrapper with `role="button"`, `tabIndex={0}`, `aria-label` = `${label} · ${kind} · ${path}`, Enter/Space triggers selection, visible focus ring using the existing ring token.
- Risk: position sync effect can fight user drags if keyed too broadly — key on id set, not array identity.

**C2. Recentre on any selection source (finding 2)**
- Inside the `Canvas` (inside `ReactFlowProvider`), an effect on `selectedId` centres the viewport only when the node's rect falls outside the current viewport; `onNodeClick` no longer calls `focusNode` directly.
- Depends on B1 (selection lives above the canvas). Behaviour change: viewport now moves after explorer/search/flow-step selection.

## Group D — Graph workspace UX and layout

**D1. Filter-aware search (finding 6)** — pass the filtered node list to `SearchPalette`; out-of-filter matches render as a separate "hidden by filters" group whose selection clears the offending filter. Depends on A2, B1, B2.

**D2. Non-stranding empty state (finding 7)** — keep `GraphToolbar` mounted above the empty state; `EmptyState` gets a "Reset filters" action wired to the shared filter setter. Depends on B1.

**D3. Flex shell instead of `calc(100vh - 57px)` (finding 9)** — layout route becomes `h-screen flex flex-col` with `min-h-0 flex-1` content; graph route drops both hardcoded 57px values and the inline style. Risk: this is the layout that previously collapsed to zero height — re-verify canvas height on desktop and mobile after the change.

**D4. Mobile rails (finding 10)** — below `lg`, canvas is the first and full-height pane; explorer/filters/flow and details move into existing `Sheet` triggers in the toolbar. Desktop layout unchanged. Depends on D3.

## Group E — Structure, a11y, error surfaces

**E1. Landmarks and headings (finding 12)** — `src/routes/index.tsx`: move `<header>`/`<footer>` outside `<main>`; graph route gains a visually-hidden `<h1>` ("Graph workspace — owner/name"). Depends on A3.

**E2. Repo error/not-found surface (finding 13)** — `repo.$owner.$name.tsx` gains `errorComponent` and `notFoundComponent` rendering the existing `ErrorState` with a retry/back-home action; the fixture lookup throws `notFound()` for an unknown owner/name so the state is reachable. Behaviour change: arbitrary `/repo/x/y` URLs now show not-found instead of the demo repo — the demo path `vercel/commerce-kit` keeps working.

**E3. Extract oversized route blocks (finding 14)** — new `src/components/repolens/CompositionPanel.tsx`, `HotspotsPanel.tsx`, `GraphSidebar.tsx`, and `src/hooks/useGraphShortcuts.ts`; route files keep wiring only. Mechanical, do last so it moves final code.

**E4. AI panel timer (finding 8)** — `AiExplanationPanel.tsx`: hold the timeout in a ref, clear before re-run and on unmount; delete the unused returned cleanup.

## Dependencies

- A → everything (tokens, constants, heading prop).
- B1 → B2, C2, D1, D2.
- D3 → D4.
- E3 last (touches code all other groups edit).
- No new packages. `@xyflow/react` hooks (`useNodesState`, `useReactFlow`) are already available.

## Recommended order

1. A1, A2, A3
2. B1, then B2
3. C1, then C2
4. E4 (independent, quick)
5. D3, D4
6. D1, D2
7. E1, E2
8. E3

## Verification per step

Playwright pass after Groups C, D and E: drag a node, select from explorer/search/flow, filter to empty and reset, tab to a node and press Enter, Overview → Graph selection hand-off, mobile viewport canvas height, and `/repo/unknown/repo` not-found.

## Risks summary

- Layout rework (D3/D4) is the highest-risk change: the canvas previously collapsed to zero height.
- Search-param state (B1) changes URLs; stale links with unknown ids must degrade to no selection.
- E2 intentionally stops unknown repo slugs from rendering the demo fixture.
