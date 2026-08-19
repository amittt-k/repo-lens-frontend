import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepositoryPrompt,
  buildNodePrompt,
  buildFlowPrompt,
  sanitizeString,
  sanitizeAnalysisContext,
  SYSTEM_PROMPT,
} from "../src/services/aiPrompt.service.js";
import { sendCompletion, AiServiceError } from "../src/services/aiProvider.client.js";
import { AiService } from "../src/services/ai.service.js";

describe("AI Foundation & Service Unit Tests", () => {
  describe("Prompt Construction & Grounding Rules", () => {
    it("builds repository prompt containing metadata, routes, symbols, and anti-hallucination rules", () => {
      const analysisData = {
        repository: {
          fullName: "expressjs/express",
          language: "JavaScript",
          description: "Fast, unopinionated web framework",
          defaultBranch: "master",
        },
        fileCount: 42,
        apiRoutes: [
          { method: "GET", path: "/users", handler: "getUsers", filePath: "routes/user.js" },
        ],
        symbols: [
          { name: "createApplication", kind: "function", filePath: "lib/express.js" },
        ],
      };

      const { systemPrompt, userPrompt } = buildRepositoryPrompt(analysisData);

      // Verify system grounding instructions
      assert.match(systemPrompt, /STRICT GROUNDING & ACCURACY RULES/);
      assert.match(systemPrompt, /NEVER invent or hallucinate/);
      assert.match(systemPrompt, /distinguish CONFIRMED facts/);

      // Verify user content includes facts
      assert.match(userPrompt, /expressjs\/express/);
      assert.match(userPrompt, /GET \/users/);
      assert.match(userPrompt, /createApplication/);
      assert.match(userPrompt, /Total Files Analyzed: 42/);
      assert.match(userPrompt, /Project Overview/);
      assert.match(userPrompt, /Architecture & Layers/);
    });

    it("builds node prompt containing entity kind, source location, relationships, and anti-hallucination rules", () => {
      const nodeData = {
        id: "sym-123",
        label: "UserService",
        kind: "class",
        path: "src/services/user.service.ts",
        startLine: 10,
        endLine: 45,
        loc: 36,
        containedSymbols: [{ name: "getUserById", kind: "method" }],
        dependsOn: [{ relationshipType: "CALLS", targetLabel: "UserRepository" }],
        usedBy: [{ relationshipType: "CALLS", sourceLabel: "UserController" }],
      };

      const { systemPrompt, userPrompt } = buildNodePrompt(nodeData);

      assert.match(systemPrompt, /STRICT GROUNDING & ACCURACY RULES/);
      assert.match(userPrompt, /UserService/);
      assert.match(userPrompt, /class/);
      assert.match(userPrompt, /src\/services\/user\.service\.ts \(Lines 10–45\)/);
      assert.match(userPrompt, /getUserById/);
      assert.match(userPrompt, /CALLS -> UserRepository/);
      assert.match(userPrompt, /CALLS <- UserController/);
    });

    it("builds flow prompt containing ordered steps, transitions, and path breakdown instructions", () => {
      const flowData = {
        name: "Login Flow",
        steps: [
          { label: "Login.jsx", kind: "component", path: "src/Login.jsx", detail: "Form submit" },
          { label: "authService", kind: "module", path: "src/auth.js", relationshipType: "CALLS", detail: "Dispatches login" },
          { label: "POST /api/login", kind: "api_route", path: "server/routes.js", relationshipType: "CALLS_API", detail: "Endpoint" },
        ],
      };

      const { systemPrompt, userPrompt } = buildFlowPrompt(flowData);

      assert.match(systemPrompt, /STRICT GROUNDING & ACCURACY RULES/);
      assert.match(userPrompt, /Login Flow/);
      assert.match(userPrompt, /Step 1: Login\.jsx/);
      assert.match(userPrompt, /Step 2: authService.*\[CALLS\]/);
      assert.match(userPrompt, /Step 3: POST \/api\/login.*\[CALLS_API\]/);
    });
  });

  describe("Secret Sanitization & Context Filtering", () => {
    it("redacts obvious secret and API token literals from prompt text", () => {
      const textWithSecrets = "Config with apiKey: 'sk-1234567890abcdef12345678' and token: ghp_1234567890abcdef1234567890";
      const sanitized = sanitizeString(textWithSecrets);

      assert.doesNotMatch(sanitized, /sk-1234567890abcdef12345678/);
      assert.doesNotMatch(sanitized, /ghp_1234567890abcdef1234567890/);
      assert.match(sanitized, /REDACTED_SECRET/);
    });

    it("filters .env and private certificate files from repository context", () => {
      const dirtyContext = {
        files: [
          { path: "src/index.js" },
          { path: ".env" },
          { path: ".env.production" },
          { path: "server.key" },
          { path: "src/app.js" },
        ],
        fileTree: [
          { name: "src", children: [{ name: "index.js" }] },
          { name: ".env" },
          { name: "id_rsa" },
        ],
      };

      const clean = sanitizeAnalysisContext(dirtyContext);

      assert.equal(clean.files.length, 2);
      assert.deepEqual(clean.files.map((f) => f.path), ["src/index.js", "src/app.js"]);
      assert.equal(clean.fileTree.length, 1);
      assert.equal(clean.fileTree[0].name, "src");
    });
  });

  describe("Provider Error, Rate-Limit & Timeout Handling", () => {
    it("throws AI_MISSING_KEY when API key is not configured", async () => {
      await assert.rejects(
        async () => {
          await sendCompletion("system", "user", { apiKey: "" });
        },
        (err) => {
          assert.equal(err.code, "AI_MISSING_KEY");
          assert.equal(err.statusCode, 503);
          return true;
        },
      );
    });

    it("throws AI_RATE_LIMIT_ERROR on HTTP 429 response", async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded: quota depleted",
      });

      await assert.rejects(
        async () => {
          await sendCompletion("system", "user", {
            apiKey: "mock-key",
            fetchFn: mockFetch,
          });
        },
        (err) => {
          assert.equal(err.code, "AI_RATE_LIMIT_ERROR");
          assert.equal(err.statusCode, 429);
          return true;
        },
      );
    });

    it("throws AI_PROVIDER_ERROR on HTTP 500 error", async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 500,
        text: async () => "Internal server error at provider",
      });

      await assert.rejects(
        async () => {
          await sendCompletion("system", "user", {
            apiKey: "mock-key",
            fetchFn: mockFetch,
          });
        },
        (err) => {
          assert.equal(err.code, "AI_PROVIDER_ERROR");
          assert.equal(err.statusCode, 502);
          return true;
        },
      );
    });

    it("throws AI_TIMEOUT_ERROR when request exceeds timeoutMs", async () => {
      const mockFetch = async (url, options) => {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const abortErr = new Error("The operation was aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          });
        });
      };

      await assert.rejects(
        async () => {
          await sendCompletion("system", "user", {
            apiKey: "mock-key",
            timeoutMs: 10,
            fetchFn: mockFetch,
          });
        },
        (err) => {
          assert.equal(err.code, "AI_TIMEOUT_ERROR");
          assert.equal(err.statusCode, 504);
          return true;
        },
      );
    });

    it("throws AI_RESPONSE_ERROR when response JSON is malformed or missing choices", async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [] }),
      });

      await assert.rejects(
        async () => {
          await sendCompletion("system", "user", {
            apiKey: "mock-key",
            fetchFn: mockFetch,
          });
        },
        (err) => {
          assert.equal(err.code, "AI_RESPONSE_ERROR");
          assert.equal(err.statusCode, 502);
          return true;
        },
      );
    });
  });

  describe("AiService End-to-End Service Methods", () => {
    const aiService = new AiService();

    it("rejects empty or missing context with INVALID_AI_CONTEXT", async () => {
      await assert.rejects(
        () => aiService.explainRepository(null),
        (err) => err.code === "INVALID_AI_CONTEXT",
      );

      await assert.rejects(
        () => aiService.explainNode({}),
        (err) => err.code === "INVALID_AI_CONTEXT",
      );

      await assert.rejects(
        () => aiService.explainFlow({ steps: [] }),
        (err) => err.code === "INVALID_AI_CONTEXT",
      );
    });

    it("explainRepository executes successfully with mocked provider", async () => {
      const mockFetch = async (url, opts) => {
        const body = JSON.parse(opts.body);
        assert.equal(body.model, "gpt-4o-mini");
        assert.match(body.messages[1].content, /test-repo/);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "gpt-4o-mini",
            choices: [
              {
                message: {
                  content: "### Project Overview\nThis repository is a web application.",
                },
              },
            ],
            usage: { total_tokens: 150 },
          }),
        };
      };

      const result = await aiService.explainRepository(
        { repository: { fullName: "owner/test-repo" } },
        { apiKey: "mock-key", fetchFn: mockFetch },
      );

      assert.match(result.explanation, /Project Overview/);
      assert.equal(result.model, "gpt-4o-mini");
      assert.equal(result.usage.total_tokens, 150);
    });

    it("explainNode executes successfully with mocked provider", async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: "### Role & Responsibility\nAuthService handles user sessions.",
              },
            },
          ],
        }),
      });

      const result = await aiService.explainNode(
        { id: "node-1", label: "AuthService", kind: "class" },
        { apiKey: "mock-key", fetchFn: mockFetch },
      );

      assert.match(result.explanation, /AuthService handles user sessions/);
    });

    it("explainFlow executes successfully with mocked provider", async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: "### Flow Summary\nUser login flow traces from UI to handler.",
              },
            },
          ],
        }),
      });

      const result = await aiService.explainFlow(
        {
          steps: [
            { label: "Login.jsx", path: "src/Login.jsx" },
            { label: "auth()", path: "src/auth.js", relationshipType: "CALLS" },
          ],
        },
        { apiKey: "mock-key", fetchFn: mockFetch },
      );

      assert.match(result.explanation, /User login flow traces/);
    });
  });
});
