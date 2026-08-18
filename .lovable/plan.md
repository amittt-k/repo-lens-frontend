# RepoLens Frontend Review

Senior-engineer review of the current build. No new features proposed, no fixes applied. Findings only, ordered by severity.

## CRITICAL

### 1. Graph nodes cannot be dragged or keyboard-reached
- **File:** `src/components/repolens/graph/GraphCanvas.tsx`, `src/components/repolens/graph/CodeNode.tsx`
- **Problem:** `nodes` / `edges` are passed to `<ReactFlow>` as fully controlled arrays derived with `useMemo`, but no `onNodesChange` / `onEdgesChange` handlers exist. Every drag is discarded on the next render. `CodeNode` renders a plain `div` with no `tabIndex`, `role`, or accessible name, so nodes are mouse-only.
- **Why it matters:** Repositioning nodes is the primary way users untangle a dependency graph, and the graph is the core surface of the product. Keyboard and screen-reader users currently cannot select any node at all.
- **Fix:** Hold node state locally with `useNodesState` (seed from props, sync on prop change) and wire `onNodesChange`. Give `CodeNode` a focusable wrapper with `role="button"`, `tabIndex={0}`, `aria-label` combining label + path + kind, and Enter/Space selection.

### 2. Selection made outside the canvas never moves the viewport
- **File:** `src/routes/repo.$owner.$name.graph.tsx`, `src/components/repolens/graph/GraphCanvas.tsx`
- **Problem:** `focusNode` is only called from `onNodeClick`. Selecting from the file explorer, search palette, or a flow step updates `selectedId` but leaves the viewport where it was — often with the selected node off-screen.
- **Why it matters:** The three main entry points into the graph appear broken; users see the details panel change with no visible graph feedback.
- **Fix:** Move focus into an effect inside `Canvas` keyed on `selectedId` (centering only when the node is outside the current viewport), so any selection source recentres.

## HIGH

### 3. Workspace state is duplicated per route and lost on navigation
- **File:** `src/routes/repo.$owner.$name.index.tsx`, `src/routes/repo.$owner.$name.graph.tsx`
- **Problem:** `selectedId` and `flowId` are independent `useState` in both routes. Overview → Graph resets selection; the graph hardcodes `"n-cart-store"` as its initial selection.
- **Why it matters:** "Inspect in graph workspace" drops the user's context, which is the exact hand-off the dashboard exists to support. Nothing is shareable or reloadable either.
- **Fix:** Lift `selectedId` / `flowId` / `traceMode` into the `/repo/$owner/$name` layout — either route context or validated search params on the layout route — and read them from both children.

### 4. Components read fixtures directly instead of receiving data
- **File:** `src/components/repolens/NodeDetailsPanel.tsx` (`mockGraphNodes` in `EdgeRow`), `FileExplorer.tsx`, `SearchPalette.tsx`, `FlowTracePanel.tsx`
- **Problem:** Presentational components import `@/data/mock-repo` at module scope rather than taking data as props.
- **Why it matters:** These components are unusable against real data without rewriting each one, and they cannot render loading/empty variants driven by a real fetch.
- **Fix:** Accept `nodes` / `tree` / `flows` as props (defaulting to the mock at the route level only), so the fixture import lives in one place.

### 5. `traceMode` and `flowId` encode one concept as two states
- **File:** `src/routes/repo.$owner.$name.graph.tsx`, `src/components/repolens/GraphToolbar.tsx`
- **Problem:** The Trace toggle can be on with `flowId` null (silently no-op) and is patched with ad-hoc corrections (`if (next && !flowId) setFlowId(mockFlows[0]!.id)`) in one place but not in `FlowTracePanel`'s clear path.
- **Why it matters:** Reachable states where the toggle reads "on" but nothing highlights — looks like a bug in the tracing feature.
- **Fix:** Make the active flow id the single source of truth (`null` = tracing off) and derive `traceMode` from it.

## MEDIUM

### 6. Search results and node selection ignore active filters
- **File:** `src/components/repolens/SearchPalette.tsx`, `src/routes/repo.$owner.$name.graph.tsx`
- **Problem:** The palette lists all `mockGraphNodes`; selecting a node filtered out of the graph populates the details panel with nothing highlighted on canvas.
- **Fix:** Pass the filtered node list into the palette, or flag out-of-filter hits and offer to clear the filter.

### 7. Filtered-empty graph strands the user
- **File:** `src/routes/repo.$owner.$name.graph.tsx`
- **Problem:** When `nodes.length === 0`, the whole canvas — including `GraphToolbar` — is replaced by an `EmptyState` with no reset action. With the sidebar collapsed there is no visible way back.
- **Fix:** Keep the toolbar mounted and add a "Reset filters" action to the empty state.

### 8. Timer leak / state update after unmount in the AI panel
- **File:** `src/components/repolens/AiExplanationPanel.tsx`
- **Problem:** `explain()` creates a `setTimeout` and returns a cleanup function that no caller ever uses; the `onClick` discards it.
- **Fix:** Track the timeout in a ref and clear it in an unmount effect and before each re-run.

### 9. Layout height depends on a hardcoded header height
- **File:** `src/routes/repo.$owner.$name.graph.tsx` (`lg:h-[calc(100vh-57px)]` and the inline `height: "calc(100vh - 57px)"`)
- **Problem:** `57px` is a measured constant for the sticky header, duplicated twice, and wrong whenever the header wraps or its padding changes.
- **Fix:** Express the shell as a flex column (`h-screen` root, `min-h-0 flex-1` content) or a shared CSS variable set on the layout.

### 10. Mobile graph workspace is unusable without scrolling past both rails
- **File:** `src/routes/repo.$owner.$name.graph.tsx`
- **Problem:** Below `lg`, the left rail (explorer 300px + filters + flow panel) and right rail stack vertically around the canvas; the collapse buttons are `hidden lg:flex`, and the canvas keeps a `100vh` height.
- **Fix:** On small screens present rails in a sheet/drawer or a tab switcher, and keep the canvas as the first visible pane.

### 11. Colour maps for kinds and relations are duplicated three times
- **File:** `src/components/repolens/primitives.tsx` (`kindStyles`, `relationStyles`), `graph/CodeNode.tsx` (`ring`, `tint`), `graph/GraphCanvas.tsx` (`edgeColor`)
- **Problem:** Four parallel `Record<NodeKind, …>` maps plus one relation-colour map, each maintained separately.
- **Fix:** Export one token map per kind/relation (border, text, raw CSS var) from the data or a `graph-tokens` module and consume it everywhere.

### 12. Heading and landmark structure is incorrect
- **File:** `src/routes/index.tsx`, `src/routes/repo.$owner.$name.graph.tsx`, `src/components/repolens/primitives.tsx`
- **Problem:** The landing page nests `<header>` and `<footer>` *inside* `<main>`. The graph route has no `<h1>` at all, while every `PanelHeading` emits an `<h2>`, producing many `h2`s with no `h1`.
- **Why it matters:** Breaks landmark navigation for screen readers and weakens the page outline for crawlers.
- **Fix:** Move the landing header/footer outside `<main>`; add a visually-hidden `<h1>` to the graph route; make `PanelHeading`'s heading level a prop (default `h3` for panels).

### 13. No error / not-found path for an unresolvable repository
- **File:** `src/routes/repo.$owner.$name.tsx`, `src/routes/repo.$owner.$name.index.tsx`
- **Problem:** Any `owner/name` renders the full `vercel/commerce-kit` fixture. The route tree has no `errorComponent` or `notFoundComponent`, even though the review scope includes error states and `ErrorState` already exists.
- **Fix:** Add an `errorComponent`/`notFoundComponent` on the repo layout using `ErrorState`, so the state exists as a real UI surface ready for the backend.

### 14. Route components carry inline sub-sections that should be components
- **File:** `src/routes/repo.$owner.$name.index.tsx` (Composition + Hotspots blocks, ~90 lines of JSX), `src/routes/repo.$owner.$name.graph.tsx` (sidebar assembly + keyboard shortcut + filter derivation)
- **Problem:** Route files mix layout, state wiring and presentational markup; the two largest UI blocks on the dashboard have no reusable home.
- **Fix:** Extract `CompositionPanel`, `HotspotsPanel`, `GraphSidebar`, and a `useGraphShortcuts` hook. Purely mechanical moves, no behaviour change.

## LOW

### 15. Naming inconsistencies across the repo boundary
- **File:** `src/routes/analyzing.tsx` (`?repo=`) vs `src/routes/repo.$owner.$name.tsx` (`$name`), plus `GraphNodeData` / `CodeNodePayload` / `FileNode`
- **Problem:** The same value is `repo` in search params and `name` in path params, forcing `{ owner, name: repo }` translations at every call site; three names describe the same entity in different layers.
- **Fix:** Standardise on `name` for the repository slug, and rename `CodeNodePayload` to `GraphNodeRenderData` (or reuse the data type) to make the relationship obvious.

### 16. Debug-only affordances ship in the UI
- **File:** `src/routes/analyzing.tsx` ("Preview error state" button), `src/components/repolens/primitives.tsx` (`MockBadge` communicates only via `title`)
- **Fix:** Gate the preview button behind `import.meta.env.DEV` or the `?fail` param, and give `MockBadge` a visually-hidden description instead of a `title` tooltip.

### 17. Submit button can latch disabled forever
- **File:** `src/components/repolens/RepoUrlForm.tsx`
- **Problem:** `setPending(true)` is never reset; if navigation is blocked or the user returns via history, Analyze stays disabled.
- **Fix:** Reset `pending` in the navigate promise's `finally`, or key it off router state.

### 18. Shortcut handler misses common typing contexts
- **File:** `src/routes/repo.$owner.$name.graph.tsx`
- **Problem:** The `/` and Cmd-K listener only exempts `INPUT` and `TEXTAREA` — not `contentEditable` elements, and it doesn't ignore IME composition.
- **Fix:** Also bail on `e.isComposing` and `target.isContentEditable`.

### 19. `allRelations` / `allKinds` live in a component file
- **File:** `src/components/repolens/RelationshipFilters.tsx`
- **Problem:** Domain constants are exported from a UI module and re-imported by routes, and they duplicate the `NodeKind` / `RelationKind` unions in `mock-repo.ts`.
- **Fix:** Move both to `src/data/mock-repo.ts` (or a `graph-domain` module) next to their types.

### 20. O(n·m) `Array.includes` inside graph render maps
- **File:** `src/components/repolens/graph/GraphCanvas.tsx`
- **Problem:** `traceNodeIds.includes(...)` runs per node and twice per edge on every recompute.
- **Fix:** Build a `Set` once per memo. Irrelevant at fixture scale, relevant when real repos arrive.

## What is already solid

Routing matches TanStack conventions (`createFileRoute` strings, layout `<Outlet />`, per-route `head()` with distinct metadata and `noindex` on `/analyzing`); the client-only lazy `GraphCanvas` boundary is correct; `EmptyState` / `ErrorState` / `KindBadge` / `StatTile` primitives are well factored and consistently reused; form validation messages are specific and `role="alert"` is present; the mock data layer is typed and single-sourced.

## Next step

No code changes made. Say which severities to act on and I will draft an implementation plan.
