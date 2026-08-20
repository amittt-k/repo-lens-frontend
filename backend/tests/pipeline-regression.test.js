import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrchestratorService } from "../src/services/orchestrator.service.js";
import { buildGraph, normalizeSymbolNodeType } from "../src/analyzers/graph/graphBuilder.js";

describe("Phase 28A — Pipeline Regression Tests", () => {
  it("1. Production end-to-end analysis fetches source files automatically and generates relationships when options.fileContents is omitted", async () => {
    let analysisCreated = null;
    let analysisUpdated = null;
    const symbolsPersisted = [];
    const depsPersisted = [];
    const symbolRelsPersisted = [];
    const routesPersisted = [];

    const mockPrisma = {
      repository: {
        findUnique: async ({ where }) => {
          if (where.id === "repo-prod-1") {
            return { id: "repo-prod-1", owner: "sample-owner", name: "sample-repo", defaultBranch: "main" };
          }
          return null;
        },
      },
      analysis: {
        create: async ({ data }) => {
          analysisCreated = { id: "analysis-prod-1", ...data };
          return analysisCreated;
        },
        update: async ({ data }) => {
          analysisUpdated = { ...analysisCreated, ...data };
          return analysisUpdated;
        },
      },
      file: {
        findMany: async ({ where }) => {
          return [
            { id: "f-math", path: "src/utils/math.ts", repositoryId: "repo-prod-1" },
            { id: "f-btn", path: "src/components/Button.tsx", repositoryId: "repo-prod-1" },
            { id: "f-api", path: "src/routes/api.ts", repositoryId: "repo-prod-1" },
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
          } else {
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

    const mockGithubService = {
      fetchRepositorySourceFiles: async (owner, name, branch, supportedPaths) => {
        const fileMap = new Map();
        fileMap.set("src/utils/math.ts", "export function add(a: number, b: number) { return a + b; }");
        fileMap.set("src/components/Button.tsx", 'import { add } from "../utils/math"; export function Button() { return <button>{add(1, 2)}</button>; }');
        fileMap.set("src/routes/api.ts", 'import { add } from "../utils/math"; router.get("/calculate", (req, res) => res.json(add(1, 2)));');
        return fileMap;
      },
    };

    const orchestrator = new OrchestratorService({
      prisma: mockPrisma,
      githubService: mockGithubService,
    });

    // Invoke without options.fileContents (production call signature)
    const result = await orchestrator.analyzeRepository("repo-prod-1");

    assert.equal(result.success, true);
    assert.equal(result.analysis.status, "COMPLETED");
    assert.ok(result.analysis.stats.totalSymbols >= 2, `Expected >= 2 symbols, got ${result.analysis.stats.totalSymbols}`);
    assert.ok(result.analysis.stats.totalDependencies >= 2, `Expected >= 2 dependencies, got ${result.analysis.stats.totalDependencies}`);
    assert.ok(result.analysis.stats.totalRelationships >= 2, `Expected >= 2 relationships, got ${result.analysis.stats.totalRelationships}`);
    assert.ok(symbolsPersisted.length >= 2, "Expected symbols to be persisted");
    assert.ok(depsPersisted.length >= 2, "Expected IMPORTS relationships to be persisted");
  });

  it("2. GraphBuilder resolves composite key symbol identifiers to database symbol UUID nodes", () => {
    const files = [
      { id: "file-uuid-1", path: "src/utils/math.ts", name: "math.ts" },
      { id: "file-uuid-2", path: "src/components/Button.tsx", name: "Button.tsx" },
    ];

    const symbols = [
      { id: "sym-uuid-1", fileId: "file-uuid-1", name: "add", type: "FUNCTION" },
      { id: "sym-uuid-2", fileId: "file-uuid-2", name: "Button", type: "COMPONENT" },
    ];

    const relationships = [
      // File -> Symbol CONTAINS using composite targetId
      {
        id: "rel-1",
        sourceId: "src/utils/math.ts",
        targetId: "src/utils/math.ts::add::FUNCTION",
        relationshipType: "CONTAINS",
      },
      // Symbol -> Symbol CALLS using composite sourceId and targetId
      {
        id: "rel-2",
        sourceId: "src/components/Button.tsx::Button::COMPONENT",
        targetId: "src/utils/math.ts::add::FUNCTION",
        relationshipType: "CALLS",
      },
      // Symbol -> Symbol USES using short composite
      {
        id: "rel-3",
        sourceId: "src/components/Button.tsx::Button",
        targetId: "src/utils/math.ts::add",
        relationshipType: "USES",
      },
      // Unresolved relationship that should be safely omitted without crashing
      {
        id: "rel-4",
        sourceId: "nonexistent::foo",
        targetId: "sym-uuid-1",
        relationshipType: "CALLS",
      },
    ];

    const graph = buildGraph({
      files,
      symbols,
      relationships,
    });

    assert.equal(graph.nodes.length, 4); // 2 files + 2 symbols
    assert.equal(graph.edges.length, 3); // rel-1, rel-2, rel-3 resolved; rel-4 safely ignored

    const containsEdge = graph.edges.find((e) => e.relationshipType === "CONTAINS");
    assert.ok(containsEdge);
    assert.equal(containsEdge.source, "file-uuid-1");
    assert.equal(containsEdge.target, "sym-uuid-1");

    const callsEdge = graph.edges.find((e) => e.relationshipType === "CALLS");
    assert.ok(callsEdge);
    assert.equal(callsEdge.source, "sym-uuid-2");
    assert.equal(callsEdge.target, "sym-uuid-1");

    const usesEdge = graph.edges.find((e) => e.relationshipType === "USES");
    assert.ok(usesEdge);
    assert.equal(usesEdge.source, "sym-uuid-2");
    assert.equal(usesEdge.target, "sym-uuid-1");
  });

  it("3. GraphBuilder preserves existing UUID-based relationship resolution", () => {
    const files = [
      { id: "f-1", path: "src/a.ts", name: "a.ts" },
      { id: "f-2", path: "src/b.ts", name: "b.ts" },
    ];
    const symbols = [
      { id: "s-1", fileId: "f-1", name: "fnA", type: "FUNCTION" },
      { id: "s-2", fileId: "f-2", name: "fnB", type: "FUNCTION" },
    ];
    const relationships = [
      { id: "r-1", sourceId: "f-1", targetId: "f-2", relationshipType: "IMPORTS" },
      { id: "r-2", sourceId: "s-1", targetId: "s-2", relationshipType: "CALLS" },
    ];

    const graph = buildGraph({ files, symbols, relationships });
    assert.equal(graph.edges.length, 2);
    assert.equal(graph.edges[0].source, "f-1");
    assert.equal(graph.edges[0].target, "f-2");
    assert.equal(graph.edges[1].source, "s-1");
    assert.equal(graph.edges[1].target, "s-2");
  });

  it("4. Symbol type normalization properly maps Prisma type and legacy kind fields", () => {
    assert.equal(normalizeSymbolNodeType("FUNCTION"), "function");
    assert.equal(normalizeSymbolNodeType("COMPONENT"), "component");
    assert.equal(normalizeSymbolNodeType("CLASS"), "class");
    assert.equal(normalizeSymbolNodeType("METHOD"), "method");
    assert.equal(normalizeSymbolNodeType("INTERFACE"), "type");
    assert.equal(normalizeSymbolNodeType("TYPE"), "type");
    assert.equal(normalizeSymbolNodeType("VARIABLE"), "variable");
    assert.equal(normalizeSymbolNodeType("UNKNOWN"), "symbol");

    const files = [{ id: "f-1", path: "src/test.ts", name: "test.ts" }];
    const symbols = [
      { id: "s-1", fileId: "f-1", name: "MyComp", type: "COMPONENT" },
      { id: "s-2", fileId: "f-1", name: "myFn", kind: "FUNCTION" }, // legacy kind
      { id: "s-3", fileId: "f-1", name: "MyClass", type: "CLASS" },
    ];

    const graph = buildGraph({ files, symbols, relationships: [] });
    const compNode = graph.nodes.find((n) => n.id === "s-1");
    const fnNode = graph.nodes.find((n) => n.id === "s-2");
    const clsNode = graph.nodes.find((n) => n.id === "s-3");

    assert.equal(compNode?.type, "component");
    assert.equal(fnNode?.type, "function");
    assert.equal(clsNode?.type, "class");
  });

  it("5. Empty or unsupported repositories (e.g. SQL/CSV only) execute gracefully without error", async () => {
    const mockPrisma = {
      repository: {
        findUnique: async () => ({ id: "repo-sql-1", owner: "data", name: "sql-project" }),
      },
      analysis: {
        create: async ({ data }) => ({ id: "analysis-sql-1", ...data }),
        update: async ({ data }) => ({ id: "analysis-sql-1", ...data }),
      },
      file: {
        findMany: async () => [
          { id: "f-1", path: "scripts/query.sql", repositoryId: "repo-sql-1" },
          { id: "f-2", path: "data/users.csv", repositoryId: "repo-sql-1" },
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

    const orchestrator = new OrchestratorService({ prisma: mockPrisma });
    const result = await orchestrator.analyzeRepository("repo-sql-1");

    assert.equal(result.success, true);
    assert.equal(result.analysis.status, "COMPLETED");
    assert.equal(result.analysis.stats.totalFiles, 2);
    assert.equal(result.analysis.stats.analyzedFiles, 0);
    assert.equal(result.analysis.stats.totalSymbols, 0);
    assert.equal(result.analysis.stats.totalRelationships, 0);
  });
});
