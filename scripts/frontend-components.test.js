import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import ReactDOMClient from "react-dom/client";

// 1. Setup Headless DOM Environment using JSDOM
const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.self = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.PointerEvent = dom.window.MouseEvent;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
} catch {
  // ignore if already defined
}

const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const {
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  RouterProvider,
} = await import("@tanstack/react-router");
const { AiExplanationPanel } = await import("../src/components/repolens/AiExplanationPanel.tsx");
const { NodeDetailsPanel } = await import("../src/components/repolens/NodeDetailsPanel.tsx");
const { FlowTracePanel } = await import("../src/components/repolens/FlowTracePanel.tsx");
const { Analyzing, Route: AnalyzingRoute } = await import("../src/routes/analyzing.tsx");
const apiService = (await import("../src/services/api.service.ts")).default;

function withQueryClient(ui, setupFn) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  if (setupFn) {
    setupFn(queryClient);
  }
  return React.createElement(QueryClientProvider, { client: queryClient }, ui);
}

describe("TEST-001: Frontend Headless Component / DOM Unit Tests", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.getElementById("root");
    container.innerHTML = "";
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container.innerHTML = "";
  });

  describe("AiExplanationPanel DOM Behavior", () => {
    it("renders repository mode idle state and triggers explainRepository on click", async () => {
      let requestedRepoId = null;
      apiService.explainRepository = async (repoId) => {
        requestedRepoId = repoId;
        return {
          explanation: "### Architecture\nThis repository is a modular monolith.\n* Layer 1: Controllers\n* Layer 2: Services",
          model: "gpt-4o-mini",
        };
      };

      await act(async () => {
        root.render(
          React.createElement(AiExplanationPanel, {
            mode: "repository",
            repositoryId: "repo-123",
            repoName: "test/repo",
          }),
        );
      });

      assert.ok(container.textContent.includes("Architectural Overview"));
      assert.ok(container.textContent.includes("Explain architecture"));

      // Click "Explain architecture"
      const button = container.querySelector("button");
      assert.ok(button, "Explain button should be present");

      await act(async () => {
        button.click();
      });

      assert.equal(requestedRepoId, "repo-123");
      assert.ok(container.textContent.includes("Architecture"));
      assert.ok(container.textContent.includes("This repository is a modular monolith."));
      assert.ok(container.textContent.includes("Layer 1: Controllers"));
      assert.ok(container.textContent.includes("Grounded in RepoLens analysis (gpt-4o-mini)"));
    });

    it("renders node mode and triggers explainNode on click", async () => {
      let requestedNodeId = null;
      apiService.explainNode = async (nodeId) => {
        requestedNodeId = nodeId;
        return {
          explanation: "## Role\nHandles user authentication.\n`authService.verify()` validates credentials.",
          model: "gpt-4o-mini",
        };
      };

      await act(async () => {
        root.render(
          React.createElement(AiExplanationPanel, {
            mode: "node",
            nodeId: "node-auth",
            node: { id: "node-auth", label: "AuthController" },
          }),
        );
      });

      assert.ok(container.textContent.includes("Entity: AuthController"));
      assert.ok(container.textContent.includes("Explain this node"));

      const button = container.querySelector("button");
      await act(async () => {
        button.click();
      });

      assert.equal(requestedNodeId, "node-auth");
      assert.ok(container.textContent.includes("Handles user authentication."));
      assert.ok(container.querySelector("code")?.textContent.includes("authService.verify()"));
    });

    it("renders flow mode and triggers explainFlow on click", async () => {
      let requestedFlow = null;
      const testFlow = {
        id: "flow-1",
        name: "Login Flow",
        startNodeId: "Login.jsx",
        steps: [
          { nodeId: "1", label: "Login.jsx", detail: "Entry", kind: "component" },
          { nodeId: "2", label: "authController", detail: "Dispatches login", kind: "function" },
        ],
        isLeaf: false,
      };

      apiService.explainFlow = async (flow) => {
        requestedFlow = flow;
        return {
          explanation: "### Flow Summary\nUser submits login credentials through Login.jsx.",
          model: "gpt-4o-mini",
        };
      };

      await act(async () => {
        root.render(
          React.createElement(AiExplanationPanel, {
            mode: "flow",
            flow: testFlow,
          }),
        );
      });

      assert.ok(container.textContent.includes("Flow: Login Flow"));
      assert.ok(container.textContent.includes("Explain this flow"));

      const button = container.querySelector("button");
      await act(async () => {
        button.click();
      });

      assert.deepEqual(requestedFlow, testFlow);
      assert.ok(container.textContent.includes("User submits login credentials through Login.jsx."));
    });

    it("handles error state and provides a working Try Again retry button", async () => {
      let attempt = 0;
      apiService.explainRepository = async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error("Backend connection timed out.");
        }
        return {
          explanation: "### Recovered Architecture\nSuccessfully retrieved on retry.",
        };
      };

      await act(async () => {
        root.render(
          React.createElement(AiExplanationPanel, {
            mode: "repository",
            repositoryId: "repo-fail",
          }),
        );
      });

      // Attempt 1: Click explain -> fails with error
      const explainBtn = container.querySelector("button");
      await act(async () => {
        explainBtn.click();
      });

      assert.ok(container.textContent.includes("Explanation Unavailable"));
      assert.ok(container.textContent.includes("Backend connection timed out."));

      // Find "Try again" button
      const retryBtn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Try again"),
      );
      assert.ok(retryBtn, "Retry button should be present in error state");

      // Attempt 2: Click retry -> succeeds
      await act(async () => {
        retryBtn.click();
      });

      assert.ok(container.textContent.includes("Recovered Architecture"));
      assert.ok(container.textContent.includes("Successfully retrieved on retry."));
    });

    it("safely escapes raw HTML and script tags in markdown content", async () => {
      apiService.explainNode = async () => ({
        explanation: "<script>window.pwned = true;</script><img src=x onerror=alert(1)>**Safe bold** and `code`",
      });

      await act(async () => {
        root.render(
          React.createElement(AiExplanationPanel, {
            mode: "node",
            nodeId: "node-xss",
            node: { id: "node-xss", label: "XSSNode" },
            autoLoad: true,
          }),
        );
      });

      assert.equal(window.pwned, undefined, "Script tag must NOT have executed");
      assert.equal(container.querySelector("script"), null, "No raw script elements injected");
      assert.ok(container.querySelector("strong")?.textContent.includes("Safe bold"));
      assert.ok(container.querySelector("code")?.textContent.includes("code"));
    });
  });

  describe("NodeDetailsPanel DOM Behavior", () => {
    it("renders AI tab and empty state when no entity is selected", async () => {
      await act(async () => {
        root.render(
          withQueryClient(
            React.createElement(NodeDetailsPanel, {
              node: null,
            }),
          ),
        );
      });

      assert.ok(container.textContent.includes("No entity selected"));
    });

    it("renders node entity details with tabs including AI tab", async () => {
      const mockNode = {
        id: "node-user-service",
        label: "UserService",
        path: "src/services/user.service.ts",
        kind: "class",
        loc: 120,
      };

      await act(async () => {
        root.render(
          withQueryClient(
            React.createElement(NodeDetailsPanel, {
              node: mockNode,
              nodesById: { "node-user-service": mockNode },
            }),
            (client) => {
              client.setQueryData(["node-details", "node-user-service"], {
                id: "node-user-service",
                label: "UserService",
                type: "class",
                path: "src/services/user.service.ts",
                data: { loc: 120 },
              });
              client.setQueryData(["node-relationships", "node-user-service"], {
                incoming: [],
                outgoing: [],
              });
            },
          ),
        );
      });

      assert.ok(container.textContent.includes("UserService"));
      assert.ok(container.textContent.includes("Details"));
      assert.ok(container.textContent.includes("Relations"));
      assert.ok(container.textContent.includes("AI"));
    });

    it("renders 3-column equal grid for metrics (LINES, DEPENDS ON, USED BY) with min-w-0 and truncation", async () => {
      const mockNode = {
        id: "node-metrics",
        label: "LargeModule",
        path: "src/large.ts",
        kind: "module",
      };

      await act(async () => {
        root.render(
          withQueryClient(
            React.createElement(NodeDetailsPanel, {
              node: mockNode,
              nodesById: { "node-metrics": mockNode },
            }),
            (client) => {
              client.setQueryData(["node-details", "node-metrics"], {
                id: "node-metrics",
                label: "LargeModule",
                type: "file",
                data: { loc: 5400, startLine: 1, endLine: 5400 },
              });
              client.setQueryData(["node-relationships", "node-metrics"], {
                incoming: new Array(42).fill({ id: "in-1", relationshipType: "IMPORTS" }),
                outgoing: new Array(18).fill({ id: "out-1", relationshipType: "IMPORTS" }),
              });
            },
          ),
        );
      });

      const metricsContainer = container.querySelector("dl");
      assert.ok(metricsContainer, "Metrics <dl> should be rendered");
      assert.ok(metricsContainer.className.includes("grid-cols-3"), "Must use grid-cols-3");
      assert.ok(metricsContainer.className.includes("min-w-0"), "Must include min-w-0");

      const metricCards = container.querySelectorAll("dl > div");
      assert.equal(metricCards.length, 3, "Must render exactly 3 metrics cards");

      assert.ok(metricCards[0].textContent.includes("Lines"));
      assert.ok(metricCards[0].textContent.includes("5400 LOC"));

      assert.ok(metricCards[1].textContent.includes("Depends on"));
      assert.ok(metricCards[1].textContent.includes("18"));

      assert.ok(metricCards[2].textContent.includes("Used by"));
      assert.ok(metricCards[2].textContent.includes("42"));
    });

    it("renders extreme long node labels and deeply nested paths with truncation without clipping", async () => {
      const extremeLabel = "useVeryLongAndComplexRepositoryAnalyticsDataMutationHookWithNestedSelectorsAndMemoizedState";
      const extremePath = "src/packages/subpackages/nested/deeply/very/long/path/name/that/should/truncate/cleanly/HookFile.tsx";

      const mockNode = {
        id: "node-extreme",
        label: extremeLabel,
        path: extremePath,
        kind: "function",
      };

      await act(async () => {
        root.render(
          withQueryClient(
            React.createElement(NodeDetailsPanel, {
              node: mockNode,
              nodesById: { "node-extreme": mockNode },
            }),
            (client) => {
              client.setQueryData(["node-details", "node-extreme"], {
                id: "node-extreme",
                label: extremeLabel,
                type: "function",
                data: { filePath: extremePath, loc: 45 },
              });
              client.setQueryData(["node-relationships", "node-extreme"], {
                incoming: [],
                outgoing: [],
              });
            },
          ),
        );
      });

      const headerTitle = container.querySelector("h4");
      assert.ok(headerTitle, "Header title <h4> must exist");
      assert.ok(headerTitle.className.includes("truncate"), "Header title must have truncate class");
      assert.equal(headerTitle.getAttribute("title"), extremeLabel, "Must have full label in title attribute");

      const pathPara = container.querySelector("h4 + p");
      assert.ok(pathPara, "Path paragraph must exist");
      assert.ok(pathPara.className.includes("truncate"), "Path paragraph must have truncate class");
      assert.equal(pathPara.getAttribute("title"), extremePath, "Must have full path in title attribute");
    });

    it("renders multiple node kinds (file, function, method, class, component, api_route) properly", async (t) => {
      const kindsToTest = [
        { kind: "file", label: "index.ts", type: "file" },
        { kind: "function", label: "calculateTotal()", type: "function" },
        { kind: "method", label: "render()", type: "method" },
        { kind: "class", label: "AuthManager", type: "class" },
        { kind: "component", label: "UserCard", type: "component" },
        { kind: "api_route", label: "POST /api/auth/login", type: "api_route", data: { method: "POST", path: "/api/auth/login" } },
      ];

      for (const item of kindsToTest) {
        await t.test(`renders ${item.kind}`, async () => {
          const mockNode = {
            id: `node-${item.kind}`,
            label: item.label,
            path: `src/${item.label}`,
            kind: item.kind,
          };

          const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
          });
          queryClient.setQueryData(["node-details", `node-${item.kind}`], {
            id: `node-${item.kind}`,
            label: item.label,
            type: item.type,
            data: item.data || { loc: 50 },
          });
          queryClient.setQueryData(["node-relationships", `node-${item.kind}`], {
            incoming: [],
            outgoing: [],
          });

          await act(async () => {
            root.render(
              React.createElement(
                QueryClientProvider,
                { client: queryClient },
                React.createElement(NodeDetailsPanel, {
                  node: mockNode,
                  nodesById: { [`node-${item.kind}`]: mockNode },
                }),
              ),
            );
          });

          assert.ok(container.textContent.includes(item.label), `Must render label for ${item.kind}`);
          if (item.kind === "api_route") {
            assert.ok(container.textContent.includes("POST"), "API Route callout must render method");
          }
        });
      }
    });

    it("switching sequentially between nodes updates state without leaving stale or broken layout", async () => {
      const nodeA = { id: "node-a", label: "FirstNode", kind: "file" };
      const nodeB = { id: "node-b", label: "SecondNode", kind: "component" };

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
      });
      queryClient.setQueryData(["node-details", "node-a"], {
        id: "node-a",
        label: "FirstNode",
        type: "file",
        data: { loc: 10 },
      });
      queryClient.setQueryData(["node-relationships", "node-a"], {
        incoming: [],
        outgoing: [],
      });
      queryClient.setQueryData(["node-details", "node-b"], {
        id: "node-b",
        label: "SecondNode",
        type: "component",
        data: { loc: 85 },
      });
      queryClient.setQueryData(["node-relationships", "node-b"], {
        incoming: [],
        outgoing: [],
      });

      function TestHarness({ activeNode }) {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(NodeDetailsPanel, {
            node: activeNode,
            nodesById: { "node-a": nodeA, "node-b": nodeB },
          }),
        );
      }

      // Render Node A
      await act(async () => {
        root.render(React.createElement(TestHarness, { activeNode: nodeA }));
      });

      assert.ok(container.textContent.includes("FirstNode"));
      assert.ok(!container.textContent.includes("SecondNode"));

      // Switch to Node B within the same mounted tree
      await act(async () => {
        root.render(React.createElement(TestHarness, { activeNode: nodeB }));
      });

      assert.ok(!container.textContent.includes("FirstNode"), "Stale Node A should not remain");
      assert.ok(container.textContent.includes("SecondNode"), "Node B should now be visible");
      assert.ok(container.textContent.includes("85 LOC"), "Node B metrics should be visible");
    });
  });

  describe("FlowTracePanel DOM Behavior", () => {
    it("renders active flow steps in order with relationship badges and triggers step select", async () => {
      let selectedStepNodeId = null;
      let changedFlowId = "initial";

      const testFlow = {
        id: "flow-checkout",
        name: "Checkout Process",
        startNodeId: "Cart.tsx",
        steps: [
          { nodeId: "Cart.tsx", label: "Cart.tsx", path: "src/Cart.tsx", detail: "User clicks checkout", kind: "component" },
          { nodeId: "checkout()", label: "checkout()", path: "src/api.ts", detail: "Initiates payment", relationshipType: "CALLS", kind: "function" },
          { nodeId: "POST /api/pay", label: "POST /api/pay", path: "server.js", detail: "Processes charge", relationshipType: "CALLS_API", kind: "api_route" },
        ],
        isLeaf: false,
      };

      await act(async () => {
        root.render(
          React.createElement(FlowTracePanel, {
            flows: [testFlow],
            activeFlow: testFlow,
            activeFlowId: "flow-checkout",
            onFlowChange: (id) => {
              changedFlowId = id;
            },
            onStepSelect: (id) => {
              selectedStepNodeId = id;
            },
            selectedNodeId: "checkout()",
          }),
        );
      });

      assert.ok(container.textContent.includes("Checkout Process"));
      assert.ok(container.textContent.includes("3 steps"));
      assert.ok(container.textContent.includes("Cart.tsx"));
      assert.ok(container.textContent.includes("checkout()"));
      assert.ok(container.textContent.includes("POST /api/pay"));
      assert.ok(container.textContent.includes("CALLS"));
      assert.ok(container.textContent.includes("CALLS_API"));

      // Click second step button in the ordered list
      const stepButtons = container.querySelectorAll("ol button");
      assert.ok(stepButtons.length >= 3, `Expected at least 3 step buttons, found ${stepButtons.length}`);

      await act(async () => {
        stepButtons[1].click();
      });

      assert.equal(selectedStepNodeId, "checkout()");

      // Click clear trace button
      const clearBtn = container.querySelector("button[title='Clear active trace']");
      assert.ok(clearBtn, "Clear trace button should be present");

      await act(async () => {
        clearBtn.click();
      });

      assert.equal(changedFlowId, null);
    });
  });

  describe("Analyzing Route Lifecycle & Navigation Tests", () => {
    async function renderAnalyzingInRouter(options = {}) {
      const {
        initialUrl = "/analyzing?owner=facebook&repo=react",
        queryClient = new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false, gcTime: 0 },
          },
        }),
        onNavigate,
        search = { owner: "facebook", repo: "react", url: "https://github.com/facebook/react" },
      } = options;

      AnalyzingRoute.useSearch = () => search;

      const testRoot = createRootRoute();
      const testAnalyzingRoute = createRoute({
        getParentRoute: () => testRoot,
        path: "/analyzing",
        validateSearch: (s) => s,
        component: Analyzing,
      });
      const testRepoRoute = createRoute({
        getParentRoute: () => testRoot,
        path: "/repo/$owner/$name",
        component: () => {
          return React.createElement("div", { id: "repo-view" }, "Repository Overview");
        },
      });

      const testTree = testRoot.addChildren([testAnalyzingRoute, testRepoRoute]);
      const history = createMemoryHistory({ initialEntries: [initialUrl] });
      const testRouter = createRouter({
        routeTree: testTree,
        history,
      });

      await testRouter.load();

      if (onNavigate) {
        testRouter.subscribe("onResolved", (event) => {
          onNavigate(event.toLocation);
        });
      }

      return {
        ui: React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(RouterProvider, { router: testRouter }),
        ),
        router: testRouter,
        queryClient,
        history,
      };
    }

    it("1. Analysis starts once on mount", async () => {
      let callCount = 0;
      let requestedUrl = null;
      apiService.analyzeRepository = async (url) => {
        callCount++;
        requestedUrl = url;
        return new Promise(() => {}); // Keep pending
      };

      const { ui } = await renderAnalyzingInRouter();
      await act(async () => {
        root.render(ui);
      });

      assert.equal(callCount, 1);
      assert.equal(requestedUrl, "https://github.com/facebook/react");
      assert.ok(container.textContent.includes("Validating & fetching repository"));
    });

    it("2. Successful mutation causes navigation to repository overview", async () => {
      let navigatedLocation = null;
      apiService.analyzeRepository = async () => ({
        success: true,
        repository: { id: "repo-uuid-101", owner: "facebook", name: "react" },
        analysis: { id: "analysis-1", status: "COMPLETED" },
      });

      const { ui, router } = await renderAnalyzingInRouter({
        onNavigate: (loc) => {
          navigatedLocation = loc;
        },
      });

      await act(async () => {
        root.render(ui);
      });

      // Wait for mutation resolution and 400ms navigation timer
      await act(async () => {
        await new Promise((r) => setTimeout(r, 600));
      });

      assert.ok(router.state.location.pathname.startsWith("/repo/facebook/react"));
      assert.equal(router.state.location.search.repoId, "repo-uuid-101");
    });

    it("3. Navigation uses the repository ID returned by the backend", async () => {
      apiService.analyzeRepository = async () => ({
        success: true,
        repository: { id: "custom-persisted-id-888", owner: "facebook", name: "react" },
        analysis: { id: "a-888", status: "COMPLETED" },
      });

      const { ui, router } = await renderAnalyzingInRouter();

      await act(async () => {
        root.render(ui);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 600));
      });

      assert.equal(router.state.location.search.repoId, "custom-persisted-id-888");
    });

    it("4. Error mutation displays the error state UI without navigating", async () => {
      apiService.analyzeRepository = async () => {
        throw new Error("Repository 'facebook/react' not found on GitHub.");
      };

      const { ui, router } = await renderAnalyzingInRouter();

      await act(async () => {
        root.render(ui);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      assert.equal(router.state.location.pathname, "/analyzing");
      assert.ok(container.textContent.includes("Analysis could not complete"));
      assert.ok(container.textContent.includes("Repository 'facebook/react' not found on GitHub."));
      assert.ok(container.textContent.includes("Back to start"));
    });

    it("5. A long-running mutation still navigates automatically after success", async () => {
      apiService.analyzeRepository = async () => {
        await new Promise((r) => setTimeout(r, 200));
        return {
          success: true,
          repository: { id: "long-running-id-456", owner: "facebook", name: "react" },
          analysis: { id: "a-long", status: "COMPLETED" },
        };
      };

      const { ui, router } = await renderAnalyzingInRouter();

      await act(async () => {
        root.render(ui);
      });

      // Still in analyzing state during long running request
      assert.equal(router.state.location.pathname, "/analyzing");

      // Wait for delayed resolution and navigation
      await act(async () => {
        await new Promise((r) => setTimeout(r, 800));
      });

      assert.ok(router.state.location.pathname.startsWith("/repo/facebook/react"));
      assert.equal(router.state.location.search.repoId, "long-running-id-456");
    });

    it("6. React remount / StrictMode does not leave the UI permanently stuck", async () => {
      let resolvePromise;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      let callCount = 0;
      apiService.analyzeRepository = async () => {
        callCount++;
        return pendingPromise;
      };

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false, gcTime: 0 },
        },
      });

      const { ui, router } = await renderAnalyzingInRouter({ queryClient });

      // First mount
      await act(async () => {
        root.render(ui);
      });

      // Unmount (simulating StrictMode unmount)
      await act(async () => {
        root.unmount();
      });

      // Re-create root and remount (simulating StrictMode remount)
      root = ReactDOMClient.createRoot(container);
      await act(async () => {
        root.render(ui);
      });

      // Backend finishes
      await act(async () => {
        resolvePromise({
          success: true,
          repository: { id: "strict-mode-id-777", owner: "facebook", name: "react" },
          analysis: { id: "a-strict", status: "COMPLETED" },
        });
      });

      // Wait for navigation timer
      await act(async () => {
        await new Promise((r) => setTimeout(r, 600));
      });

      assert.ok(router.state.location.pathname.startsWith("/repo/facebook/react"));
      assert.equal(router.state.location.search.repoId, "strict-mode-id-777");
    });

    it("7. No browser refresh is required after successful analysis", async () => {
      let analyzed = false;
      apiService.analyzeRepository = async () => {
        analyzed = true;
        return {
          success: true,
          repository: { id: "no-refresh-id-123", owner: "facebook", name: "react" },
          analysis: { id: "a-123", status: "COMPLETED" },
        };
      };

      const { ui, router } = await renderAnalyzingInRouter();

      await act(async () => {
        root.render(ui);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 600));
      });

      assert.equal(analyzed, true);
      assert.ok(router.state.location.pathname.startsWith("/repo/facebook/react"));
      assert.equal(router.state.location.search.repoId, "no-refresh-id-123");
    });
  });
});
