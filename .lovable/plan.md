# RepoLens Remediation — Resume at Group B

Group A is complete: `src/lib/graph-tokens.ts` holds the kind/relation colour tokens plus `allKinds`/`allRelations`, `primitives.tsx` reads from it and `PanelHeading` takes an `as` prop, and `RelationshipFilters`, `CodeNode` and `GraphCanvas` all consume the shared tokens. Typecheck is clean.

Remaining work continues in the approved order: B, C, E4, D3/D4, D1/D2, E1/E2, E3. No new features, no backend, no redesign.

## Group B — Shared workspace state

**B1. One source of truth in the repo layout** (`src/routes/repo.$owner.$name.tsx`)
- Add validated search params: `node` (string), `flow` (string), `kinds` and `relations` (comma lists), all optional and tolerant of unknown values — an unrecognised id resolves to "nothing selected" rather than throwing.
- Layout exposes `selectedId`, `activeFlowId`, filter state and setters (search-param writes via `navigate({ search })`).
- Delete `traceMode` as independent state: tracing is on exactly when `activeFlowId` is set. `GraphToolbar` gets `activeFlowId` + `onToggleTrace` that sets or clears the id.
- `repo.$owner.$name.graph.tsx` and `repo.$owner.$name.index.tsx` drop their local `useState` for selection/flow/filters and the hardcoded `"n-cart-store"` seed; selection falls back to nothing until the user picks a node.
- Behaviour changes (intended): selection survives Overview ↔ Graph navigation, graph URLs become shareable, Trace can no longer be on with nothing highlighted.

**B2. Data via props, not fixture imports**
- `FileExplorer` takes a `tree` prop, `FlowTracePanel` a `flows` prop, `SearchPalette` a `nodes` prop, `NodeDetailsPanel` a `nodesById` lookup (drops its `mockGraphNodes` import).
- After this, `@/data/mock-repo` is imported only by the two route files and the layout.

## Group C — Graph canvas correctness

**C1. Draggable, keyboard-reachable nodes**
- `GraphCanvas.tsx`: adopt `useNodesState`/`useEdgesState`, seed from props, re-sync in an effect keyed on the incoming id set (not array identity) so user drag positions survive re-renders; wire `onNodesChange`/`onEdgesChange`.
- `CodeNode.tsx`: focusable wrapper with `role="button"`, `tabIndex={0}`, `aria-label` of `label · kind · path`, Enter/Space selects, visible focus ring using the existing token.

**C2. Recentre on any selection source**
- Inside `Canvas` (already under `ReactFlowProvider`), an effect on `selectedId` centres the viewport only when the node lies outside the current viewport; `onNodeClick` stops calling `focusNode` directly.

## Group E4 — AI panel timer

`AiExplanationPanel.tsx`: hold the timeout in a ref, clear it before re-running and on unmount; remove the unused returned cleanup.

## Group D — Layout and workspace UX

- **D3.** Layout route becomes `h-screen flex flex-col` with `min-h-0 flex-1` content; the graph route drops both `calc(100vh - 57px)` values and the inline style. Highest-risk change — canvas height re-verified on desktop and mobile.
- **D4.** Below `lg`, the canvas is the first, full-height pane; explorer/filters/flow and details move into `Sheet` triggers in the toolbar. Desktop layout unchanged.
- **D1.** `SearchPalette` receives the filtered node list; out-of-filter matches render in a separate "hidden by filters" group, and selecting one clears the offending filter.
- **D2.** `GraphToolbar` stays mounted above the filtered-empty state, and `EmptyState` gets a "Reset filters" action wired to the shared setter.

## Group E — Structure, a11y, error surfaces

- **E1.** `src/routes/index.tsx`: move `<header>`/`<footer>` outside `<main>`; graph route gains a visually hidden `<h1>` ("Graph workspace — owner/name").
- **E2.** `repo.$owner.$name.tsx` gains `errorComponent` and `notFoundComponent` rendering the existing `ErrorState` with retry / back-home; the fixture lookup throws `notFound()` for an unknown owner/name. Intended change: arbitrary `/repo/x/y` URLs now show not-found; the demo path `vercel/commerce-kit` keeps working.
- **E3.** Extract `CompositionPanel.tsx`, `HotspotsPanel.tsx`, `GraphSidebar.tsx` and `src/hooks/useGraphShortcuts.ts`; route files keep wiring only. Done last since it moves final code.

## Verification

Playwright pass after C, D and E: drag a node; select from explorer, search and flow steps; filter to empty and reset; tab to a node and press Enter; Overview → Graph selection hand-off; mobile canvas height; `/repo/unknown/repo` not-found. Typecheck after each group.

## Notes

No new packages — `useNodesState` and `useReactFlow` ship with `@xyflow/react`. Existing visual language, routes and flows are preserved throughout.
