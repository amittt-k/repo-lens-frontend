import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { buildGraph, normalizeSymbolNodeType } from "../src/analyzers/graph/graphBuilder.js";
import { GraphService, GraphServiceError } from "../src/services/graph.service.js";

describe("Graph Builder Unit Tests", () => {
  const mockRepo = { id: "repo-1", owner: "testowner", name: "testrepo" };

  const mockFiles = [
    { id: "f-1", name: "index.ts", path: "src/index.ts", extension: ".ts", isSupportedSource: true, size: 400, loc: 20 },
    { id: "f-2", name: "users.ts", path: "src/controllers/users.ts", extension: ".ts", isSupportedSource: true, size: 800, loc: 40 },
    { id: "f-3", name: "Button.tsx", path: "src/components/Button.tsx", extension: ".tsx", isSupportedSource: true, size: 600, loc: 30 },
  ];

  const mockSymbols = [
    { id: "sym-1", name: "getUsers", kind: "Function", fileId: "f-2", isExported: true, startLine: 5, endLine: 15 },
    { id: "sym-2", name: "UserController", kind: "Class", fileId: "f-2", isExported: true, startLine: 1, endLine: 30 },
    { id: "sym-3", name: "fetchData", kind: "Method", fileId: "f-2", isExported: false, startLine: 18, endLine: 25 },
    { id: "sym-4", name: "Button", kind: "Component", fileId: "f-3", isExported: true, startLine: 3, endLine: 20 },
  ];

  const mockApiRoutes = [
    { id: "route-1", method: "GET", path: "/api/users", handler: "getUsers", fileId: "f-2" },
  ];

  const mockRelationships = [
    { id: "rel-1", sourceId: "f-1", targetId: "f-2", relationshipType: "IMPORTS" },
    { id: "rel-2", sourceId: "f-1", targetId: "package:axios", relationshipType: "IMPORTS", metadata: { isExternal: true, packageName: "axios" } },
    { id: "rel-3", sourceId: "f-2", targetId: "sym-1", relationshipType: "CONTAINS" },
    { id: "rel-4", sourceId: "sym-2", targetId: "sym-3", relationshipType: "CONTAINS" },
    { id: "rel-5", sourceId: "sym-1", targetId: "sym-3", relationshipType: "CALLS" },
    { id: "rel-6", sourceId: "sym-4", targetId: "sym-4", relationshipType: "USES" },
    { id: "rel-7", sourceId: "sym-1", targetId: "route-1", relationshipType: "HANDLES_ROUTE" },
  ];

  it("normalizes symbol kinds to proper node types", () => {
    assert.equal(normalizeSymbolNodeType("Function"), "function");
    assert.equal(normalizeSymbolNodeType("Class"), "class");
    assert.equal(normalizeSymbolNodeType("Method"), "method");
    assert.equal(normalizeSymbolNodeType("Component"), "component");
    assert.equal(normalizeSymbolNodeType("Interface"), "type");
    assert.equal(normalizeSymbolNodeType("Variable"), "variable");
    assert.equal(normalizeSymbolNodeType(null), "symbol");
  });

  it("builds a complete normalized graph representation with all node and edge types", () => {
    const graph = buildGraph({
      repository: mockRepo,
      files: mockFiles,
      symbols: mockSymbols,
      relationships: mockRelationships,
      apiRoutes: mockApiRoutes,
    });

    assert.ok(graph.nodes);
    assert.ok(graph.edges);
    assert.ok(graph.stats);

    // 3 files + 4 symbols + 1 api route + 1 package = 9 nodes
    assert.equal(graph.nodes.length, 9);
    // 7 valid relationships = 7 edges
    assert.equal(graph.edges.length, 7);

    // Check node types
    const fileNodes = graph.nodes.filter((n) => n.type === "file");
    const funcNodes = graph.nodes.filter((n) => n.type === "function");
    const classNodes = graph.nodes.filter((n) => n.type === "class");
    const methodNodes = graph.nodes.filter((n) => n.type === "method");
    const compNodes = graph.nodes.filter((n) => n.type === "component");
    const routeNodes = graph.nodes.filter((n) => n.type === "api_route");
    const pkgNodes = graph.nodes.filter((n) => n.type === "package");

    assert.equal(fileNodes.length, 3);
    assert.equal(funcNodes.length, 1);
    assert.equal(classNodes.length, 1);
    assert.equal(methodNodes.length, 1);
    assert.equal(compNodes.length, 1);
    assert.equal(routeNodes.length, 1);
    assert.equal(pkgNodes.length, 1);

    // Check deterministic IDs
    assert.equal(pkgNodes[0].id, "package:axios");
    assert.equal(routeNodes[0].id, "route-1");
  });

  it("filters edges by relationship types", () => {
    const graph = buildGraph({
      repository: mockRepo,
      files: mockFiles,
      symbols: mockSymbols,
      relationships: mockRelationships,
      apiRoutes: mockApiRoutes,
      options: { relationshipTypes: ["IMPORTS"] },
    });

    assert.equal(graph.edges.length, 2);
    assert.ok(graph.edges.every((e) => e.relationshipType === "IMPORTS"));
  });

  it("filters nodes by node types and prunes disconnected edges", () => {
    const graph = buildGraph({
      repository: mockRepo,
      files: mockFiles,
      symbols: mockSymbols,
      relationships: mockRelationships,
      apiRoutes: mockApiRoutes,
      options: { nodeTypes: ["file"] },
    });

    assert.equal(graph.nodes.length, 3);
    assert.ok(graph.nodes.every((n) => n.type === "file"));
    // Only file-to-file IMPORTS edge remains (rel-1: f-1 -> f-2)
    assert.equal(graph.edges.length, 1);
    assert.equal(graph.edges[0].source, "f-1");
    assert.equal(graph.edges[0].target, "f-2");
  });

  it("retrieves 1-hop connected neighborhood for a selected node", () => {
    const graph = buildGraph({
      repository: mockRepo,
      files: mockFiles,
      symbols: mockSymbols,
      relationships: mockRelationships,
      apiRoutes: mockApiRoutes,
      options: { nodeId: "sym-1" },
    });

    // sym-1 is connected to: f-2 (CONTAINS), sym-3 (CALLS), route-1 (HANDLES_ROUTE)
    // 1 target + 3 neighbors = 4 nodes
    assert.equal(graph.nodes.length, 4);
    assert.equal(graph.edges.length, 3);
  });

  it("handles duplicate relationships and dangling references gracefully", () => {
    const duplicatesAndDangling = [
      ...mockRelationships,
      { id: "rel-dup", sourceId: "f-1", targetId: "f-2", relationshipType: "IMPORTS" },
      { id: "rel-dangling-src", sourceId: "missing-src", targetId: "f-2", relationshipType: "IMPORTS" },
      { id: "rel-dangling-tgt", sourceId: "f-1", targetId: "missing-tgt", relationshipType: "IMPORTS" },
    ];

    const graph = buildGraph({
      repository: mockRepo,
      files: mockFiles,
      symbols: mockSymbols,
      relationships: duplicatesAndDangling,
      apiRoutes: mockApiRoutes,
    });

    // Duplicate edge ignored, dangling edges safely discarded
    assert.equal(graph.edges.length, 7);
  });

  it("produces empty nodes and edges for empty repository without throwing", () => {
    const graph = buildGraph({
      repository: mockRepo,
      files: [],
      symbols: [],
      relationships: [],
      apiRoutes: [],
    });

    assert.equal(graph.nodes.length, 0);
    assert.equal(graph.edges.length, 0);
    assert.equal(graph.stats.totalNodes, 0);
    assert.equal(graph.stats.totalEdges, 0);
  });
});

describe("Graph Service Unit Tests", () => {
  it("loads repository data and returns normalized graph structure", async () => {
    const mockDb = {
      repository: {
        findUnique: async () => ({ id: "repo-123", owner: "o", name: "n" }),
      },
      file: {
        findMany: async () => [{ id: "f-1", path: "src/index.js", name: "index.js" }],
      },
      symbol: {
        findMany: async () => [],
      },
      relationship: {
        findMany: async () => [],
      },
      apiRoute: {
        findMany: async () => [],
      },
    };

    const service = new GraphService({ prisma: mockDb });
    const result = await service.getRepositoryGraph("repo-123");

    assert.equal(result.success, true);
    assert.equal(result.repository.id, "repo-123");
    assert.equal(result.graph.nodes.length, 1);
    assert.equal(result.graph.edges.length, 0);
  });

  it("throws 404 when repository does not exist", async () => {
    const mockDb = {
      repository: {
        findUnique: async () => null,
      },
    };

    const service = new GraphService({ prisma: mockDb });

    await assert.rejects(
      async () => {
        await service.getRepositoryGraph("missing-repo-id");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes("not found"));
        return true;
      },
    );
  });
});

describe("GET /api/repositories/:id/graph HTTP Endpoint Tests", () => {
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

  it("returns 404 for nonexistent repository ID", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000/graph`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, "error");
    assert.match(body.message, /not found/i);
  });
});
