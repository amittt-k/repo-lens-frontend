import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { traceFlowFromNode, discoverRepositoryFlows } from "../src/utils/flowTracing.ts";

describe("Deterministic Flow Tracing Engine Tests", () => {
  it("traces a linear execution flow (A -> B -> C -> D)", () => {
    const nodes = [
      { id: "A", label: "Login.jsx", kind: "component" },
      { id: "B", label: "loginUser()", kind: "function" },
      { id: "C", label: "authService", kind: "module" },
      { id: "D", label: "POST /api/login", kind: "api_route" },
    ];

    const edges = [
      { id: "e1", source: "A", target: "B", relationshipType: "CALLS" },
      { id: "e2", source: "B", target: "C", relationshipType: "CALLS" },
      { id: "e3", source: "C", target: "D", relationshipType: "CALLS_API" },
    ];

    const flow = traceFlowFromNode("A", nodes, edges);
    assert.equal(flow.steps.length, 4);
    assert.deepEqual(flow.steps.map((s) => s.nodeId), ["A", "B", "C", "D"]);
    assert.equal(flow.steps[1].relationshipType, "CALLS");
    assert.equal(flow.steps[2].relationshipType, "CALLS");
    assert.equal(flow.steps[3].relationshipType, "CALLS_API");
    assert.equal(flow.isLeaf, false);
  });

  it("handles deterministic branching flow", () => {
    const nodes = [
      { id: "A", label: "App.tsx", kind: "component" },
      { id: "B", label: "Navbar.tsx", kind: "component" },
      { id: "C", label: "authenticate()", kind: "function" },
    ];

    const edges = [
      // B is USES (priority 2), C is CALLS (priority 1) -> CALLS should be picked
      { id: "e1", source: "A", target: "B", relationshipType: "USES" },
      { id: "e2", source: "A", target: "C", relationshipType: "CALLS" },
    ];

    const flow = traceFlowFromNode("A", nodes, edges);
    assert.equal(flow.steps.length, 2);
    assert.equal(flow.steps[1].nodeId, "C");
    assert.equal(flow.steps[1].relationshipType, "CALLS");
  });

  it("handles circular graphs and terminates cleanly (A -> B -> C -> A)", () => {
    const nodes = [
      { id: "A", label: "A.ts", kind: "module" },
      { id: "B", label: "B.ts", kind: "module" },
      { id: "C", label: "C.ts", kind: "module" },
    ];

    const edges = [
      { id: "e1", source: "A", target: "B", relationshipType: "CALLS" },
      { id: "e2", source: "B", target: "C", relationshipType: "CALLS" },
      { id: "e3", source: "C", target: "A", relationshipType: "CALLS" },
    ];

    const flow = traceFlowFromNode("A", nodes, edges);
    assert.equal(flow.steps.length, 3);
    assert.deepEqual(flow.steps.map((s) => s.nodeId), ["A", "B", "C"]);
  });

  it("handles disconnected / leaf node gracefully", () => {
    const nodes = [{ id: "A", label: "Standalone.ts", kind: "module" }];
    const edges = [];

    const flow = traceFlowFromNode("A", nodes, edges);
    assert.equal(flow.steps.length, 1);
    assert.equal(flow.steps[0].nodeId, "A");
    assert.equal(flow.isLeaf, true);
  });

  it("respects maxDepth boundary limit", () => {
    const nodes = [
      { id: "1", label: "Node 1" },
      { id: "2", label: "Node 2" },
      { id: "3", label: "Node 3" },
      { id: "4", label: "Node 4" },
      { id: "5", label: "Node 5" },
    ];

    const edges = [
      { id: "e1", source: "1", target: "2", relationshipType: "CALLS" },
      { id: "e2", source: "2", target: "3", relationshipType: "CALLS" },
      { id: "e3", source: "3", target: "4", relationshipType: "CALLS" },
      { id: "e4", source: "4", target: "5", relationshipType: "CALLS" },
    ];

    const flow = traceFlowFromNode("1", nodes, edges, { maxDepth: 3 });
    assert.equal(flow.steps.length, 3);
    assert.deepEqual(flow.steps.map((s) => s.nodeId), ["1", "2", "3"]);
  });

  it("handles missing node and empty graph", () => {
    const flowEmpty = traceFlowFromNode("unknown", [], []);
    assert.equal(flowEmpty.steps.length, 1);
    assert.equal(flowEmpty.steps[0].nodeId, "unknown");

    const flowMissing = traceFlowFromNode("unknown", [{ id: "A", label: "A" }], []);
    assert.equal(flowMissing.steps.length, 1);
    assert.equal(flowMissing.steps[0].nodeId, "unknown");
  });

  it("ignores non-flow relationships (e.g. CONTAINS, EXTENDS) for execution path", () => {
    const nodes = [
      { id: "File1", label: "File1.ts", kind: "file" },
      { id: "Func1", label: "func1()", kind: "function" },
    ];

    const edges = [
      { id: "e1", source: "File1", target: "Func1", relationshipType: "CONTAINS" },
    ];

    const flow = traceFlowFromNode("File1", nodes, edges);
    assert.equal(flow.steps.length, 1);
    assert.equal(flow.isLeaf, true);
  });

  it("discovers repository flows from entry points", () => {
    const nodes = [
      { id: "Route1", label: "POST /api/checkout", kind: "api_route" },
      { id: "Controller1", label: "checkoutHandler", kind: "function" },
      { id: "Service1", label: "checkoutService", kind: "module" },
    ];

    const edges = [
      { id: "e1", source: "Route1", target: "Controller1", relationshipType: "HANDLES_ROUTE" },
      { id: "e2", source: "Controller1", target: "Service1", relationshipType: "CALLS" },
    ];

    const flows = discoverRepositoryFlows(nodes, edges);
    assert.equal(flows.length, 1);
    assert.equal(flows[0].startNodeId, "Route1");
    assert.equal(flows[0].steps.length, 3);
  });
});
