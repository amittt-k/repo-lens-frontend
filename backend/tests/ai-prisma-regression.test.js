import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import prisma from "../src/config/database.js";
import app from "../src/app.js";
import { aiContextService } from "../src/services/aiContext.service.js";
import { aiService } from "../src/services/ai.service.js";

describe("AI Prisma Schema Conformance & Regression Tests", () => {
  let server;
  let baseUrl;
  let repoId;
  let fileNodeId;
  let symbolNodeId;
  let originalAiApiKey;

  before(async () => {
    // Setup test HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Look up or seed a repository in the database for real query testing
    let repo = await prisma.repository.findFirst({
      include: {
        files: {
          include: {
            symbols: true,
            apiRoutes: true,
          },
        },
      },
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          githubUrl: "https://github.com/test-org/ai-conformance-repo",
          owner: "test-org",
          name: "ai-conformance-repo",
          defaultBranch: "main",
          language: "TypeScript",
          description: "Regression test repository",
          files: {
            create: [
              {
                path: "src/service.ts",
                name: "service.ts",
                extension: "ts",
                type: "file",
                size: 1500,
                loc: 50,
                symbols: {
                  create: [
                    {
                      name: "UserService",
                      type: "CLASS",
                      startLine: 1,
                      endLine: 40,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          files: {
            include: {
              symbols: true,
              apiRoutes: true,
            },
          },
        },
      });
    }

    repoId = repo.id;
    fileNodeId = repo.files[0]?.id;
    symbolNodeId = repo.files[0]?.symbols[0]?.id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("1. assembleRepositoryContext queries database cleanly without Prisma Unknown field kind error", async () => {
    const context = await aiContextService.assembleRepositoryContext(repoId);
    assert.ok(context, "Context should be assembled");
    assert.equal(context.repository.id, repoId);
    assert.ok(Array.isArray(context.symbols), "symbols must be an array");

    // Verify symbols have semantic kind/type and filePath
    if (context.symbols.length > 0) {
      const sym = context.symbols[0];
      assert.ok(sym.name, "Symbol must have name");
      assert.ok(sym.kind || sym.type, "Symbol must have semantic kind/type");
      assert.equal(typeof sym.filePath, "string", "filePath must be a string");
    }
  });

  it("2. assembleNodeContext for File node queries database cleanly without Prisma Unknown field kind error", async () => {
    if (!fileNodeId) return;

    const context = await aiContextService.assembleNodeContext(fileNodeId);
    assert.ok(context, "Node context should be assembled");
    assert.equal(context.id, fileNodeId);
    assert.ok(Array.isArray(context.containedSymbols), "containedSymbols must be an array");

    for (const sym of context.containedSymbols) {
      assert.ok(sym.name);
      assert.ok(sym.kind || sym.type);
    }
  });

  it("3. assembleNodeContext for Symbol node queries database cleanly without Prisma Unknown field kind error", async () => {
    if (!symbolNodeId) return;

    const context = await aiContextService.assembleNodeContext(symbolNodeId);
    assert.ok(context, "Symbol context should be assembled");
    assert.equal(context.id, symbolNodeId);
  });

  it("4. POST /api/ai/explain/repository executes cleanly and handles AI provider integration", async () => {
    // Mock aiService.explainRepository to test end-to-end controller flow without external LLM call
    const originalMethod = aiService.explainRepository;
    aiService.explainRepository = async (facts) => {
      assert.ok(facts.repository);
      assert.ok(Array.isArray(facts.symbols));
      return {
        explanation: "### Architecture\nVerified architectural facts without Prisma field error.",
        model: "gpt-4o-mini",
        usage: { total_tokens: 150 },
      };
    };

    try {
      const res = await fetch(`${baseUrl}/api/ai/explain/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repoId }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.repositoryId, repoId);
      assert.ok(json.explanation.includes("Verified architectural facts"));
    } finally {
      aiService.explainRepository = originalMethod;
    }
  });

  it("5. POST /api/ai/explain/node executes cleanly and handles AI provider integration", async () => {
    if (!fileNodeId) return;

    const originalMethod = aiService.explainNode;
    aiService.explainNode = async (facts) => {
      assert.ok(facts.id);
      assert.ok(Array.isArray(facts.containedSymbols));
      return {
        explanation: "### Entity Details\nVerified entity facts without Prisma field error.",
        model: "gpt-4o-mini",
        usage: { total_tokens: 100 },
      };
    };

    try {
      const res = await fetch(`${baseUrl}/api/ai/explain/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: fileNodeId }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.nodeId, fileNodeId);
      assert.ok(json.explanation.includes("Verified entity facts"));
    } finally {
      aiService.explainNode = originalMethod;
    }
  });

  it("6. POST /api/ai/explain/flow executes cleanly and handles AI provider integration", async () => {
    const originalMethod = aiService.explainFlow;
    aiService.explainFlow = async (facts) => {
      assert.ok(facts.steps);
      return {
        explanation: "### Flow Details\nVerified flow trace explanation.",
        model: "gpt-4o-mini",
        usage: { total_tokens: 80 },
      };
    };

    try {
      const res = await fetch(`${baseUrl}/api/ai/explain/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: {
            id: "flow-1",
            name: "Test Flow",
            steps: [{ nodeId: fileNodeId || "node-1", label: "Step 1", kind: "file" }],
          },
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.explanation.includes("Verified flow trace explanation"));
    } finally {
      aiService.explainFlow = originalMethod;
    }
  });
});
