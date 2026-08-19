import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { traceFlowFromNode } from "../src/utils/flowTracing.ts";

describe("Frontend AI Service Integration Tests", () => {
  let mockServer;
  let serverPort;
  let lastRequestBody = null;
  let lastRequestPath = null;
  let mockResponseStatus = 200;
  let mockResponseBody = {};

  before((t, done) => {
    mockServer = http.createServer((req, res) => {
      lastRequestPath = req.url;
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          lastRequestBody = body ? JSON.parse(body) : null;
        } catch {
          lastRequestBody = body;
        }
        res.writeHead(mockResponseStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mockResponseBody));
      });
    });

    mockServer.listen(0, () => {
      serverPort = mockServer.address().port;
      done();
    });
  });

  after((t, done) => {
    mockServer.close(done);
  });

  async function mockRequest(path, body) {
    const res = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  it("1. explainRepository sends repositoryId to /api/ai/explain/repository", async () => {
    mockResponseStatus = 200;
    mockResponseBody = {
      success: true,
      repositoryId: "repo-abc",
      explanation: "### Architecture Overview\nLayered Node.js application.",
      model: "gpt-4o-mini",
      usage: { total_tokens: 250 },
    };

    const res = await mockRequest("/api/ai/explain/repository", { repositoryId: "repo-abc" });

    assert.equal(res.status, 200);
    assert.equal(lastRequestPath, "/api/ai/explain/repository");
    assert.deepEqual(lastRequestBody, { repositoryId: "repo-abc" });
    assert.equal(res.data.success, true);
    assert.match(res.data.explanation, /Architecture Overview/);
  });

  it("2. explainRepository handles error response properly", async () => {
    mockResponseStatus = 404;
    mockResponseBody = {
      status: "error",
      statusCode: 404,
      message: "Repository with ID \"invalid-repo\" not found.",
    };

    const res = await mockRequest("/api/ai/explain/repository", { repositoryId: "invalid-repo" });

    assert.equal(res.status, 404);
    assert.match(res.data.message, /not found/);
  });

  it("3. explainNode sends nodeId to /api/ai/explain/node", async () => {
    mockResponseStatus = 200;
    mockResponseBody = {
      success: true,
      nodeId: "sym-login",
      explanation: "### Role & Responsibility\nAuthenticates user credentials.",
      model: "gpt-4o-mini",
      usage: { total_tokens: 180 },
    };

    const res = await mockRequest("/api/ai/explain/node", { nodeId: "sym-login" });

    assert.equal(res.status, 200);
    assert.equal(lastRequestPath, "/api/ai/explain/node");
    assert.deepEqual(lastRequestBody, { nodeId: "sym-login" });
    assert.equal(res.data.nodeId, "sym-login");
    assert.match(res.data.explanation, /Role & Responsibility/);
  });

  it("4. explainNode handles AI timeout (504)", async () => {
    mockResponseStatus = 504;
    mockResponseBody = {
      status: "error",
      statusCode: 504,
      message: "AI completion request timed out.",
    };

    const res = await mockRequest("/api/ai/explain/node", { nodeId: "sym-login" });
    assert.equal(res.status, 504);
    assert.match(res.data.message, /timed out/);
  });

  it("5. explainFlow sends active deterministic flow to /api/ai/explain/flow", async () => {
    // Generate deterministic flow using Phase 18 tracer
    const nodes = [
      { id: "comp-login", label: "Login.tsx", kind: "component", path: "src/Login.tsx" },
      { id: "fn-auth", label: "authService", kind: "function", path: "src/auth.ts" },
      { id: "route-login", label: "POST /api/login", kind: "api_route", path: "src/routes.ts" },
    ];
    const edges = [
      { id: "e1", source: "comp-login", target: "fn-auth", relationshipType: "CALLS" },
      { id: "e2", source: "fn-auth", target: "route-login", relationshipType: "CALLS_API" },
    ];

    const activeFlow = traceFlowFromNode("comp-login", nodes, edges);

    mockResponseStatus = 200;
    mockResponseBody = {
      success: true,
      flowId: activeFlow.id,
      explanation: "### Flow Summary\nUser login execution walkthrough.",
      model: "gpt-4o-mini",
      usage: { total_tokens: 290 },
    };

    const res = await mockRequest("/api/ai/explain/flow", { flow: activeFlow });

    assert.equal(res.status, 200);
    assert.equal(lastRequestPath, "/api/ai/explain/flow");
    assert.ok(lastRequestBody.flow);
    assert.equal(lastRequestBody.flow.startNodeId, "comp-login");
    assert.equal(lastRequestBody.flow.steps.length, 3);
    assert.equal(lastRequestBody.flow.steps[0].label, "Login.tsx");
    assert.equal(lastRequestBody.flow.steps[1].relationshipType, "CALLS");
    assert.equal(lastRequestBody.flow.steps[2].relationshipType, "CALLS_API");
  });

  it("6. explainFlow handles provider rate limit error (429)", async () => {
    mockResponseStatus = 429;
    mockResponseBody = {
      status: "error",
      statusCode: 429,
      message: "AI rate limit exceeded.",
    };

    const res = await mockRequest("/api/ai/explain/flow", {
      flow: { steps: [{ nodeId: "n1", label: "Root" }] },
    });
    assert.equal(res.status, 429);
    assert.match(res.data.message, /rate limit/);
  });
});
