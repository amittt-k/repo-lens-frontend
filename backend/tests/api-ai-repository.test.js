import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { AiController } from "../src/controllers/ai.controller.js";
import { aiController } from "../src/controllers/ai.controller.js";
import { AiServiceError } from "../src/services/aiProvider.client.js";

describe("AI Repository Explanation Controller & HTTP Endpoint Tests", () => {
  describe("AiController Unit Tests", () => {
    it("collects structured analysis facts and delegates to AiService.explainRepository", async () => {
      let capturedAnalysisData = null;

      const mockDb = {
        repository: {
          findUnique: async ({ where }) => {
            if (where.id === "repo-123") {
              return {
                id: "repo-123",
                name: "test-repo",
                owner: "test-owner",
                description: "A test repository",
                language: "TypeScript",
                defaultBranch: "main",
              };
            }
            return null;
          },
        },
        analysis: {
          findFirst: async () => ({ id: "analysis-1", metadata: { score: 98 } }),
        },
        file: {
          findMany: async () => [
            { id: "f1", path: "src/index.ts", size: 500 },
            { id: "f2", path: "src/app.ts", size: 1200 },
          ],
        },
        apiRoute: {
          findMany: async () => [
            { method: "GET", path: "/api/health", handler: "healthCheck", filePath: "src/routes.ts" },
          ],
        },
        symbol: {
          findMany: async () => [
            { id: "s1", name: "startServer", kind: "function", filePath: "src/index.ts" },
          ],
        },
        relationship: {
          count: async () => 15,
        },
      };

      const mockAiService = {
        explainRepository: async (data) => {
          capturedAnalysisData = data;
          return {
            explanation: "### Architecture Overview\nThis is a well-structured application.",
            model: "gpt-4o-mini",
            usage: { total_tokens: 350 },
          };
        },
      };

      const controller = new AiController({ prisma: mockDb, aiService: mockAiService });

      const req = { body: { repositoryId: "repo-123" } };
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

      await controller.explainRepository(req, res, () => {});

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.repositoryId, "repo-123");
      assert.match(responseBody.explanation, /Architecture Overview/);
      assert.equal(responseBody.model, "gpt-4o-mini");
      assert.equal(responseBody.usage.total_tokens, 350);

      // Verify collected analysisData structure passed to AI service
      assert.ok(capturedAnalysisData);
      assert.equal(capturedAnalysisData.repository.fullName, "test-owner/test-repo");
      assert.equal(capturedAnalysisData.fileCount, 2);
      assert.equal(capturedAnalysisData.apiRoutes.length, 1);
      assert.equal(capturedAnalysisData.symbols.length, 1);
      assert.equal(capturedAnalysisData.totalRelationships, 15);
    });

    it("returns 404 when repository is not found in database", async () => {
      const mockDb = {
        repository: {
          findUnique: async () => null,
        },
      };

      const controller = new AiController({ prisma: mockDb });

      const req = { body: { repositoryId: "nonexistent-id" } };
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

      await controller.explainRepository(req, res, () => {});

      assert.equal(responseStatus, 404);
      assert.equal(responseBody.status, "error");
      assert.match(responseBody.message, /not found/);
    });
  });

  describe("HTTP Integration: POST /api/ai/explain/repository", () => {
    let server;
    let baseUrl;
    let originalExplainRepository;
    let originalDb;

    function createMockDb(repoId) {
      return {
        repository: {
          findUnique: async ({ where }) => {
            if (where.id === repoId) {
              return {
                id: repoId,
                name: "app",
                owner: "user",
                description: "Demo app",
                language: "JavaScript",
                defaultBranch: "main",
              };
            }
            return null;
          },
        },
        analysis: {
          findFirst: async () => ({ id: "analysis-mock", metadata: {} }),
        },
        file: {
          findMany: async () => [{ id: "f1", path: "src/index.js", size: 300 }],
        },
        apiRoute: {
          findMany: async () => [{ method: "GET", path: "/api", handler: "root" }],
        },
        symbol: {
          findMany: async () => [{ name: "handler", kind: "function" }],
        },
        relationship: {
          count: async () => 3,
        },
      };
    }

    before((t, done) => {
      originalExplainRepository = aiController.aiService.explainRepository;
      originalDb = aiController.db;
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        done();
      });
    });

    after((t, done) => {
      aiController.aiService.explainRepository = originalExplainRepository;
      aiController.db = originalDb;
      server.close(done);
    });

    it("returns 400 when request body is empty or missing", async () => {
      const res1 = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res1.status, 400);
      const b1 = await res1.json();
      assert.match(b1.message, /repositoryId is required/);
    });

    it("returns 400 when repositoryId is empty string or non-string", async () => {
      const res2 = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "   " }),
      });
      assert.equal(res2.status, 400);

      const res3 = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: 12345 }),
      });
      assert.equal(res3.status, 400);
    });

    it("returns 404 when repositoryId does not exist in database", async () => {
      aiController.db = createMockDb("existing-repo");

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "00000000-0000-0000-0000-000000000000" }),
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.match(body.message, /not found/);
    });

    it("handles AI timeout error (returns 504)", async () => {
      aiController.db = createMockDb("mock-repo");
      aiController.aiService.explainRepository = async () => {
        throw new AiServiceError("Request timed out", "AI_TIMEOUT_ERROR", 504);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "mock-repo" }),
      });
      assert.equal(res.status, 504);
      const body = await res.json();
      assert.match(body.message, /timed out/);
    });

    it("handles AI rate limit error (returns 429)", async () => {
      aiController.db = createMockDb("mock-repo");
      aiController.aiService.explainRepository = async () => {
        throw new AiServiceError("Rate limit exceeded", "AI_RATE_LIMIT_ERROR", 429);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "mock-repo" }),
      });
      assert.equal(res.status, 429);
      const body = await res.json();
      assert.match(body.message, /Rate limit exceeded/);
    });

    it("handles AI provider failure (returns 502)", async () => {
      aiController.db = createMockDb("mock-repo");
      aiController.aiService.explainRepository = async () => {
        throw new AiServiceError("Provider 500 error", "AI_PROVIDER_ERROR", 502);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "mock-repo" }),
      });
      assert.equal(res.status, 502);
    });

    it("handles missing AI API key (returns 503)", async () => {
      aiController.db = createMockDb("mock-repo");
      aiController.aiService.explainRepository = async () => {
        throw new AiServiceError("AI API key is not configured", "AI_MISSING_KEY", 503);
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "mock-repo" }),
      });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.match(body.message, /AI API key is not configured/);
    });

    it("returns 200 with structured explanation on success", async () => {
      aiController.db = createMockDb("valid-repo");
      aiController.aiService.explainRepository = async (analysisData) => {
        assert.equal(analysisData.repository.fullName, "user/app");
        assert.equal(analysisData.fileCount, 1);
        return {
          explanation: "### Project Overview\nThis is a Node.js repository.",
          model: "gpt-4o-mini",
          usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 },
        };
      };

      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: "valid-repo" }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.repositoryId, "valid-repo");
      assert.match(body.explanation, /Project Overview/);
      assert.equal(body.model, "gpt-4o-mini");
      assert.equal(body.usage.total_tokens, 180);
    });
  });
});
