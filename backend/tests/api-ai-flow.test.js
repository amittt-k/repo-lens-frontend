import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { AiController, aiController } from "../src/controllers/ai.controller.js";
import { AiServiceError } from "../src/services/aiProvider.client.js";

describe("AI Flow Explanation Controller & HTTP Endpoint Tests", () => {
  describe("AiController explainFlow Unit Tests", () => {
    it("normalizes flow steps, preserves exact order and relationship types, and delegates to AiService.explainFlow", async () => {
      let capturedFlowData = null;

      const mockAiService = {
        explainFlow: async (data) => {
          capturedFlowData = data;
          return {
            explanation: "### Flow Summary\nUser login flow authenticates credentials.",
            model: "gpt-4o-mini",
            usage: { total_tokens: 280 },
          };
        },
      };

      const controller = new AiController({
        aiService: mockAiService,
      });

      const flowPayload = {
        flow: {
          id: "flow-login",
          name: "User Login Execution Flow",
          startNodeId: "node-login-page",
          steps: [
            {
              nodeId: "node-login-page",
              label: "LoginPage.tsx",
              kind: "component",
              path: "src/pages/LoginPage.tsx",
              detail: "Form submission triggers login",
            },
            {
              nodeId: "node-auth-service",
              label: "authService.login",
              kind: "function",
              path: "src/services/auth.service.ts",
              relationshipType: "CALLS",
              detail: "Dispatches HTTP request",
            },
            {
              nodeId: "node-api-route",
              label: "POST /api/auth/login",
              kind: "api_route",
              path: "backend/src/routes/auth.routes.js",
              relationshipType: "CALLS_API",
              detail: "Route handler dispatch",
            },
          ],
        },
      };

      const req = { body: flowPayload };
      let responseStatus = null;
      let responseBody = null;
      const res = {
        status: (s) => {
          responseStatus = s;
          return {
            json: (b) => {
              responseBody = b;
              return b;
            },
          };
        },
      };

      await controller.explainFlow(req, res, () => {});

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.flowId, "flow-login");
      assert.match(responseBody.explanation, /User login flow/);
      assert.equal(responseBody.model, "gpt-4o-mini");
      assert.equal(responseBody.usage.total_tokens, 280);

      // Verify captured flowData structure passed to AI service
      assert.ok(capturedFlowData);
      assert.equal(capturedFlowData.id, "flow-login");
      assert.equal(capturedFlowData.name, "User Login Execution Flow");
      assert.equal(capturedFlowData.startNodeId, "node-login-page");
      assert.equal(capturedFlowData.steps.length, 3);
      assert.equal(capturedFlowData.steps[0].label, "LoginPage.tsx");
      assert.equal(capturedFlowData.steps[1].relationshipType, "CALLS");
      assert.equal(capturedFlowData.steps[2].relationshipType, "CALLS_API");
    });
  });

  describe("HTTP Integration: POST /api/ai/explain/flow", () => {
    let server;
    let baseUrl;
    let originalExplainFlow;

    before((t, done) => {
      originalExplainFlow = aiController.aiService.explainFlow;
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        done();
      });
    });

    after((t, done) => {
      aiController.aiService.explainFlow = originalExplainFlow;
      server.close(done);
    });

    it("returns 400 when request body is empty or missing", async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const b = await res.json();
      assert.match(b.message, /flow steps is required/);
    });

    it("returns 400 when steps array is empty", async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: [] }),
      });
      assert.equal(res.status, 400);
    });

    it("returns 400 when flow.steps is not an array", async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: { steps: "invalid" } }),
      });
      assert.equal(res.status, 400);
    });

    it("handles AI timeout error (returns 504)", async () => {
      aiController.aiService.explainFlow = async () => {
        throw new AiServiceError("Request timed out", "AI_TIMEOUT_ERROR", 504);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: [{ nodeId: "n1", label: "StartNode", kind: "function" }],
        }),
      });
      assert.equal(res.status, 504);
      const body = await res.json();
      assert.match(body.message, /timed out/);
    });

    it("handles AI rate limit error (returns 429)", async () => {
      aiController.aiService.explainFlow = async () => {
        throw new AiServiceError("Rate limit exceeded", "AI_RATE_LIMIT_ERROR", 429);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: [{ nodeId: "n1", label: "StartNode", kind: "function" }],
        }),
      });
      assert.equal(res.status, 429);
      const body = await res.json();
      assert.match(body.message, /Rate limit exceeded/);
    });

    it("handles AI provider failure (returns 502)", async () => {
      aiController.aiService.explainFlow = async () => {
        throw new AiServiceError("Provider 500 failure", "AI_PROVIDER_ERROR", 502);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: [{ nodeId: "n1", label: "StartNode", kind: "function" }],
        }),
      });
      assert.equal(res.status, 502);
    });

    it("handles missing AI API key (returns 503)", async () => {
      aiController.aiService.explainFlow = async () => {
        throw new AiServiceError("AI API key is not configured", "AI_MISSING_KEY", 503);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: [{ nodeId: "n1", label: "StartNode", kind: "function" }],
        }),
      });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.match(body.message, /AI API key is not configured/);
    });

    it("returns 200 with structured explanation on success", async () => {
      let passedFlowData = null;
      aiController.aiService.explainFlow = async (flowData) => {
        passedFlowData = flowData;
        return {
          explanation: "### Flow Summary\nOrder creation flow processes cart checkout.",
          model: "gpt-4o-mini",
          usage: { prompt_tokens: 150, completion_tokens: 95, total_tokens: 245 },
        };
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: {
            id: "flow-checkout",
            name: "Checkout Process",
            startNodeId: "step-1",
            steps: [
              { nodeId: "step-1", label: "CheckoutButton", kind: "component", path: "src/Checkout.tsx" },
              { nodeId: "step-2", label: "createOrder", kind: "function", relationshipType: "CALLS" },
            ],
          },
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.flowId, "flow-checkout");
      assert.match(body.explanation, /Order creation flow/);
      assert.equal(body.model, "gpt-4o-mini");
      assert.equal(body.usage.total_tokens, 245);

      assert.ok(passedFlowData);
      assert.equal(passedFlowData.id, "flow-checkout");
      assert.equal(passedFlowData.steps.length, 2);
    });
  });
});
