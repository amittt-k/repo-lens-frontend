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

// 2. Import React Query & components to test
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { AiExplanationPanel } = await import("../src/components/repolens/AiExplanationPanel.tsx");
const { NodeDetailsPanel } = await import("../src/components/repolens/NodeDetailsPanel.tsx");
const { FlowTracePanel } = await import("../src/components/repolens/FlowTracePanel.tsx");
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
});
