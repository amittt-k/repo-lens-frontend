import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { OrchestratorService, OrchestratorError } from "../src/services/orchestrator.service.js";

describe("Orchestrator Service Unit Tests", () => {
  it("orchestrates complete multi-stage analysis pipeline successfully", async () => {
    let analysisCreated = null;
    let analysisUpdated = null;
    let symbolsPersisted = [];
    let depsPersisted = [];
    let symbolRelsPersisted = [];
    let routesPersisted = [];

    const mockPrisma = {
      repository: {
        findUnique: async ({ where }) => {
          if (where.id === "repo-123") {
            return { id: "repo-123", owner: "testowner", name: "testrepo" };
          }
          return null;
        },
      },
      analysis: {
        create: async ({ data }) => {
          analysisCreated = { id: "analysis-1", ...data };
          return analysisCreated;
        },
        update: async ({ where, data }) => {
          analysisUpdated = { ...analysisCreated, ...data };
          return analysisUpdated;
        },
      },
      file: {
        findMany: async ({ where }) => {
          return [
            { id: "f-ctrl", path: "src/controllers/users.js", repositoryId: "repo-123" },
            { id: "f-routes", path: "src/routes/users.js", repositoryId: "repo-123" },
            { id: "f-readme", path: "README.md", repositoryId: "repo-123" },
          ];
        },
      },
      symbol: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async ({ data }) => {
          symbolsPersisted.push(...data);
          return { count: data.length };
        },
      },
      relationship: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async ({ data }) => {
          if (data.some((d) => d.relationshipType === "IMPORTS")) {
            depsPersisted.push(...data);
          } else if (data.some((d) => ["CONTAINS", "CALLS", "USES", "EXTENDS", "IMPLEMENTS"].includes(d.relationshipType))) {
            symbolRelsPersisted.push(...data);
          }
          return { count: data.length };
        },
      },
      apiRoute: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async ({ data }) => {
          routesPersisted.push(...data);
          return { count: data.length };
        },
      },
    };

    const fileContents = {
      "src/controllers/users.js": "export function getUsers(req, res) { return []; }",
      "src/routes/users.js": 'import { getUsers } from "../controllers/users"; router.get("/users", getUsers);',
      "README.md": "# Docs",
    };

    const orchestrator = new OrchestratorService({ prisma: mockPrisma });
    const result = await orchestrator.analyzeRepository("repo-123", { fileContents });

    // 1. Check response structure
    assert.equal(result.success, true);
    assert.equal(result.analysis.id, "analysis-1");
    assert.equal(result.analysis.status, "COMPLETED");
    assert.equal(result.repository.id, "repo-123");

    // 2. Check stage stats
    assert.equal(result.analysis.stats.totalFiles, 3);
    assert.equal(result.analysis.stats.analyzedFiles, 2);
    assert.ok(result.analysis.stats.totalSymbols >= 1);
    assert.ok(result.analysis.stats.totalRoutes >= 1);

    // 3. Verify lifecycle transitions
    assert.equal(analysisCreated.status, "ANALYZING");
    assert.equal(analysisUpdated.status, "COMPLETED");
    assert.ok(analysisUpdated.completedAt);
  });

  it("throws 404 and prevents pipeline execution when repository does not exist", async () => {
    const mockPrisma = {
      repository: {
        findUnique: async () => null,
      },
    };

    const orchestrator = new OrchestratorService({ prisma: mockPrisma });

    await assert.rejects(
      async () => {
        await orchestrator.analyzeRepository("missing-id");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes("not found"));
        return true;
      },
    );
  });

  it("transitions status to FAILED when an unexpected fatal error occurs", async () => {
    let failedAnalysisUpdate = null;

    const mockPrisma = {
      repository: {
        findUnique: async () => ({ id: "repo-fail", owner: "o", name: "n" }),
      },
      analysis: {
        create: async ({ data }) => ({ id: "analysis-fail", ...data }),
        update: async ({ data }) => {
          failedAnalysisUpdate = data;
          return { id: "analysis-fail", ...data };
        },
      },
      file: {
        findMany: async () => {
          throw new Error("Fatal database query failure");
        },
      },
    };

    const orchestrator = new OrchestratorService({ prisma: mockPrisma });

    await assert.rejects(
      async () => {
        await orchestrator.analyzeRepository("repo-fail");
      },
      (err) => {
        assert.equal(err.message, "Fatal database query failure");
        return true;
      },
    );

    assert.ok(failedAnalysisUpdate);
    assert.equal(failedAnalysisUpdate.status, "FAILED");
    assert.equal(failedAnalysisUpdate.error, "Fatal database query failure");
    assert.ok(failedAnalysisUpdate.completedAt);
  });

  it("handles malformed source files without halting the entire pipeline", async () => {
    const mockPrisma = {
      repository: {
        findUnique: async () => ({ id: "repo-malformed", owner: "o", name: "n" }),
      },
      analysis: {
        create: async ({ data }) => ({ id: "a-1", ...data }),
        update: async ({ data }) => ({ id: "a-1", ...data }),
      },
      file: {
        findMany: async () => [
          { id: "f-bad", path: "src/bad.js", repositoryId: "repo-malformed" },
          { id: "f-good", path: "src/good.js", repositoryId: "repo-malformed" },
        ],
      },
      symbol: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      },
      relationship: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      },
      apiRoute: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      },
    };

    const fileContents = {
      "src/bad.js": "function broken( { const = ;",
      "src/good.js": "export function validFunction() { return true; }",
    };

    const orchestrator = new OrchestratorService({ prisma: mockPrisma });
    const result = await orchestrator.analyzeRepository("repo-malformed", { fileContents });

    assert.equal(result.success, true);
    assert.equal(result.analysis.status, "COMPLETED");
    assert.equal(result.analysis.stats.syntaxErrorsCount, 1);
    assert.equal(result.analysis.stats.totalFiles, 2);
  });
});

describe("POST /api/repositories/:id/analyze HTTP Endpoint Tests", () => {
  let server;
  let baseUrl;

  before((t, done) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((t, done) => {
    server.close(done);
  });

  it("returns 404 when repository ID does not exist", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });
});
