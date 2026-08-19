import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { NodeService, NodeServiceError } from "../src/services/node.service.js";

describe("Node Service Unit Tests", () => {
  const mockDb = {
    file: {
      findUnique: async ({ where }) => {
        if (where.id === "f-1") {
          return {
            id: "f-1",
            name: "index.ts",
            path: "src/index.ts",
            extension: ".ts",
            isSupportedSource: true,
            size: 400,
            loc: 20,
            repositoryId: "repo-1",
            repository: { id: "repo-1", owner: "owner", name: "repo" },
          };
        }
        return null;
      },
    },
    symbol: {
      findUnique: async ({ where }) => {
        if (where.id === "sym-1") {
          return {
            id: "sym-1",
            name: "calculateTotal",
            kind: "Function",
            isExported: true,
            startLine: 10,
            endLine: 25,
            fileId: "f-1",
            file: { id: "f-1", path: "src/index.ts", repositoryId: "repo-1" },
            metadata: {},
          };
        }
        return null;
      },
    },
    apiRoute: {
      findUnique: async ({ where }) => {
        if (where.id === "route-1") {
          return {
            id: "route-1",
            method: "POST",
            path: "/api/orders",
            handler: "createOrder",
            fileId: "f-1",
            file: { id: "f-1", path: "src/index.ts" },
            repositoryId: "repo-1",
            repository: { id: "repo-1", owner: "owner", name: "repo" },
          };
        }
        return null;
      },
    },
    relationship: {
      findMany: async ({ where }) => {
        if (where.sourceId === "sym-1") {
          return [
            { id: "rel-1", sourceId: "sym-1", targetId: "route-1", relationshipType: "HANDLES_ROUTE", metadata: {}, createdAt: new Date() },
          ];
        }
        if (where.targetId === "sym-1") {
          return [
            { id: "rel-2", sourceId: "f-1", targetId: "sym-1", relationshipType: "CONTAINS", metadata: {}, createdAt: new Date() },
          ];
        }
        return [];
      },
    },
  };

  const service = new NodeService({ prisma: mockDb });

  it("resolves File entity by ID", async () => {
    const node = await service.getNodeById("f-1");
    assert.equal(node.id, "f-1");
    assert.equal(node.type, "file");
    assert.equal(node.entityType, "File");
    assert.equal(node.data.filePath, "src/index.ts");
  });

  it("resolves Symbol entity by ID", async () => {
    const node = await service.getNodeById("sym-1");
    assert.equal(node.id, "sym-1");
    assert.equal(node.type, "function");
    assert.equal(node.entityType, "Symbol");
    assert.equal(node.data.name, "calculateTotal");
  });

  it("resolves ApiRoute entity by ID", async () => {
    const node = await service.getNodeById("route-1");
    assert.equal(node.id, "route-1");
    assert.equal(node.type, "api_route");
    assert.equal(node.entityType, "ApiRoute");
    assert.equal(node.data.path, "/api/orders");
  });

  it("throws 404 when node ID cannot be resolved", async () => {
    await assert.rejects(
      async () => {
        await service.getNodeById("non-existent-id");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes("not found"));
        return true;
      },
    );
  });

  it("retrieves incoming and outgoing relationships for a node", async () => {
    const result = await service.getNodeRelationships("sym-1");
    assert.equal(result.success, true);
    assert.equal(result.node.id, "sym-1");
    assert.equal(result.outgoing.length, 1);
    assert.equal(result.outgoing[0].relationshipType, "HANDLES_ROUTE");
    assert.equal(result.incoming.length, 1);
    assert.equal(result.incoming[0].relationshipType, "CONTAINS");
  });
});

describe("Phase 14 REST Endpoints Integration Tests", () => {
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

  it("POST /api/repositories/analyze returns 400 when body or url is missing", async () => {
    const res1 = await fetch(`${baseUrl}/api/repositories/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res1.status, 400);

    const res2 = await fetch(`${baseUrl}/api/repositories/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "" }),
    });
    assert.equal(res2.status, 400);
  });

  it("POST /api/repositories/analyze returns 400 when url is not a valid GitHub repository", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://gitlab.com/owner/repo" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.message.includes("GitHub"));
  });

  it("GET /api/repositories/:id returns 404 for nonexistent repository ID", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });

  it("GET /api/repositories/:id/relationships returns 404 for nonexistent repository ID", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000/relationships`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });

  it("GET /api/repositories/:id/routes returns 404 for nonexistent repository ID", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000/routes`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });

  it("GET /api/nodes/:id returns 404 for nonexistent node ID", async () => {
    const res = await fetch(`${baseUrl}/api/nodes/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });

  it("GET /api/nodes/:id/relationships returns 404 for nonexistent node ID", async () => {
    const res = await fetch(`${baseUrl}/api/nodes/00000000-0000-0000-0000-000000000000/relationships`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.message.includes("not found"));
  });
});
