import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { AiController, aiController } from "../src/controllers/ai.controller.js";
import { AiServiceError } from "../src/services/aiProvider.client.js";

describe("AI Node Explanation Controller & HTTP Endpoint Tests", () => {
  describe("AiController explainNode Unit Tests", () => {
    it("collects node facts, relationships, and contained symbols and delegates to AiService.explainNode", async () => {
      let capturedNodeData = null;

      const mockNodeService = {
        getNodeRelationships: async (id) => {
          if (id === "sym-auth") {
            return {
              node: {
                id: "sym-auth",
                label: "authenticateUser",
                type: "function",
                entityType: "Symbol",
                data: {
                  name: "authenticateUser",
                  kind: "function",
                  filePath: "src/auth/service.ts",
                  startLine: 12,
                  endLine: 40,
                  loc: 29,
                },
              },
              outgoing: [
                { relationshipType: "CALLS", targetId: "sym-db-find" },
              ],
              incoming: [
                { relationshipType: "CALLS", sourceId: "sym-login-controller" },
              ],
            };
          }
          throw new Error("Not found");
        },
      };

      const mockAiService = {
        explainNode: async (data) => {
          capturedNodeData = data;
          return {
            explanation: "### Role & Responsibility\nauthenticateUser verifies credentials.",
            model: "gpt-4o-mini",
            usage: { total_tokens: 220 },
          };
        },
      };

      const mockDb = {
        symbol: {
          findMany: async () => [],
        },
      };

      const controller = new AiController({
        prisma: mockDb,
        aiService: mockAiService,
        nodeService: mockNodeService,
      });

      const req = { body: { nodeId: "sym-auth" } };
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

      await controller.explainNode(req, res, () => {});

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.nodeId, "sym-auth");
      assert.match(responseBody.explanation, /authenticateUser verifies credentials/);
      assert.equal(responseBody.model, "gpt-4o-mini");
      assert.equal(responseBody.usage.total_tokens, 220);

      // Verify nodeData structure passed to AI service
      assert.ok(capturedNodeData);
      assert.equal(capturedNodeData.id, "sym-auth");
      assert.equal(capturedNodeData.label, "authenticateUser");
      assert.equal(capturedNodeData.kind, "function");
      assert.equal(capturedNodeData.path, "src/auth/service.ts");
      assert.equal(capturedNodeData.startLine, 12);
      assert.equal(capturedNodeData.endLine, 40);
      assert.equal(capturedNodeData.loc, 29);
      assert.equal(capturedNodeData.dependsOn.length, 1);
      assert.equal(capturedNodeData.dependsOn[0].relationshipType, "CALLS");
      assert.equal(capturedNodeData.usedBy.length, 1);
      assert.equal(capturedNodeData.usedBy[0].relationshipType, "CALLS");
    });
  });

  describe("HTTP Integration: POST /api/ai/explain/node", () => {
    let server;
    let baseUrl;
    let originalExplainNode;
    let originalNodeService;
    let originalDb;

    function createMockNodeService(nodeId) {
      return {
        getNodeRelationships: async (id) => {
          if (id === nodeId) {
            return {
              node: {
                id: nodeId,
                label: "OrderService",
                type: "class",
                entityType: "Symbol",
                data: {
                  name: "OrderService",
                  kind: "class",
                  filePath: "src/orders/service.ts",
                  startLine: 1,
                  endLine: 50,
                  loc: 50,
                },
              },
              outgoing: [
                { relationshipType: "CALLS", targetId: "target-1" },
              ],
              incoming: [
                { relationshipType: "CALLS", sourceId: "source-1" },
              ],
            };
          }
          const err = new Error(`Node with ID "${id}" not found.`);
          err.statusCode = 404;
          throw err;
        },
      };
    }

    before((t, done) => {
      originalExplainNode = aiController.aiService.explainNode;
      originalNodeService = aiController.nodeService;
      originalDb = aiController.db;
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        done();
      });
    });

    after((t, done) => {
      aiController.aiService.explainNode = originalExplainNode;
      aiController.nodeService = originalNodeService;
      aiController.db = originalDb;
      server.close(done);
    });

    it("returns 400 when request body is empty or missing", async () => {
      const res1 = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res1.status, 400);
      const b1 = await res1.json();
      assert.match(b1.message, /nodeId is required/);
    });

    it("returns 400 when nodeId is empty string or non-string", async () => {
      const res2 = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "   " }),
      });
      assert.equal(res2.status, 400);

      const res3 = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: 98765 }),
      });
      assert.equal(res3.status, 400);
    });

    it("returns 404 when nodeId does not exist in database", async () => {
      aiController.nodeService = createMockNodeService("existing-node");

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "00000000-0000-0000-0000-000000000000" }),
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.match(body.message, /not found/);
    });

    it("handles AI timeout error (returns 504)", async () => {
      aiController.nodeService = createMockNodeService("mock-node");
      aiController.aiService.explainNode = async () => {
        throw new AiServiceError("Request timed out", "AI_TIMEOUT_ERROR", 504);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "mock-node" }),
      });
      assert.equal(res.status, 504);
      const body = await res.json();
      assert.match(body.message, /timed out/);
    });

    it("handles AI rate limit error (returns 429)", async () => {
      aiController.nodeService = createMockNodeService("mock-node");
      aiController.aiService.explainNode = async () => {
        throw new AiServiceError("Rate limit exceeded", "AI_RATE_LIMIT_ERROR", 429);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "mock-node" }),
      });
      assert.equal(res.status, 429);
      const body = await res.json();
      assert.match(body.message, /Rate limit exceeded/);
    });

    it("handles AI provider failure (returns 502)", async () => {
      aiController.nodeService = createMockNodeService("mock-node");
      aiController.aiService.explainNode = async () => {
        throw new AiServiceError("Provider 500 failure", "AI_PROVIDER_ERROR", 502);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "mock-node" }),
      });
      assert.equal(res.status, 502);
    });

    it("handles missing AI API key (returns 503)", async () => {
      aiController.nodeService = createMockNodeService("mock-node");
      aiController.aiService.explainNode = async () => {
        throw new AiServiceError("AI API key is not configured", "AI_MISSING_KEY", 503);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "mock-node" }),
      });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.match(body.message, /AI API key is not configured/);
    });

    it("returns 200 with structured explanation on success", async () => {
      aiController.nodeService = createMockNodeService("valid-node");
      aiController.db = {
        symbol: { findMany: async () => [] },
      };
      aiController.aiService.explainNode = async (nodeData) => {
        assert.equal(nodeData.id, "valid-node");
        assert.equal(nodeData.label, "OrderService");
        return {
          explanation: "### Role & Responsibility\nOrderService manages order workflows.",
          model: "gpt-4o-mini",
          usage: { prompt_tokens: 110, completion_tokens: 90, total_tokens: 200 },
        };
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "valid-node" }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.nodeId, "valid-node");
      assert.match(body.explanation, /OrderService manages order workflows/);
      assert.equal(body.model, "gpt-4o-mini");
      assert.equal(body.usage.total_tokens, 200);
    });
  });
});
