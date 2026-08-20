import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AiContextService } from "../src/services/aiContext.service.js";

describe("AiContextService Unit Tests (QUALITY-002)", () => {
  it("assembles structured repository context from database using valid Prisma Symbol.type field", async () => {
    let capturedSymbolQuery = null;
    let capturedApiRouteQuery = null;

    const mockPrisma = {
      repository: {
        findUnique: async ({ where }) => {
          if (where.id === "repo-123") {
            return {
              id: "repo-123",
              name: "repo-lens",
              owner: "amittt-k",
              description: "Codebase analysis tool",
              language: "TypeScript",
              defaultBranch: "main",
            };
          }
          return null;
        },
      },
      analysis: {
        findFirst: async () => ({
          id: "analysis-1",
          metadata: { totalFiles: 10, totalSymbols: 50 },
        }),
      },
      file: {
        findMany: async () => [
          { id: "f1", path: "src/index.ts", size: 1024 },
          { id: "f2", path: "src/app.ts", size: 2048 },
        ],
      },
      apiRoute: {
        findMany: async (args) => {
          capturedApiRouteQuery = args;
          return [
            { method: "GET", path: "/api/repos", handler: "getRepos", file: { path: "src/routes.ts" } },
          ];
        },
      },
      symbol: {
        findMany: async (args) => {
          capturedSymbolQuery = args;
          // Return database records containing Prisma `type` and `file` relation
          return [
            { id: "s1", name: "getRepos", type: "FUNCTION", file: { path: "src/routes.ts" } },
          ];
        },
      },
      relationship: {
        count: async () => 15,
      },
    };

    const service = new AiContextService({ prisma: mockPrisma });
    const context = await service.assembleRepositoryContext("repo-123");

    assert.ok(context);
    assert.equal(context.repository.name, "repo-lens");
    assert.equal(context.repository.owner, "amittt-k");
    assert.equal(context.fileCount, 2);
    assert.equal(context.apiRoutes.length, 1);
    assert.equal(context.apiRoutes[0].filePath, "src/routes.ts");

    // Verify Symbol query uses `type` and NOT `kind` or `filePath` in select
    assert.ok(capturedSymbolQuery);
    assert.equal(capturedSymbolQuery.select.type, true);
    assert.equal(capturedSymbolQuery.select.kind, undefined, "Must NOT select unknown field 'kind' on Symbol");
    assert.equal(capturedSymbolQuery.select.filePath, undefined, "Must NOT select unknown field 'filePath' on Symbol");
    assert.ok(capturedSymbolQuery.select.file, "Must select file relation for path");

    // Verify mapped symbols output contains semantic kind, type, and filePath
    assert.equal(context.symbols.length, 1);
    assert.equal(context.symbols[0].name, "getRepos");
    assert.equal(context.symbols[0].kind, "FUNCTION");
    assert.equal(context.symbols[0].type, "FUNCTION");
    assert.equal(context.symbols[0].filePath, "src/routes.ts");

    assert.equal(context.totalRelationships, 15);
    assert.equal(context.analysisId, "analysis-1");
  });

  it("returns null when repository is not found", async () => {
    const mockPrisma = {
      repository: {
        findUnique: async () => null,
      },
    };

    const service = new AiContextService({ prisma: mockPrisma });
    const context = await service.assembleRepositoryContext("non-existent");
    assert.equal(context, null);
  });

  it("assembles structured node entity context for Class nodes using valid Symbol.type field", async () => {
    let capturedSymbolQuery = null;

    const mockNodeService = {
      getNodeRelationships: async (nodeId) => ({
        node: {
          id: nodeId,
          label: "AuthService",
          type: "class",
          data: { name: "AuthService", filePath: "src/auth.ts", startLine: 1, endLine: 100 },
        },
        outgoing: [
          { relationshipType: "CONTAINS", targetId: "sym-login" },
          { relationshipType: "CALLS", targetId: "node-db" },
        ],
        incoming: [
          { relationshipType: "CALLS", sourceId: "node-ctrl" },
        ],
      }),
    };

    const mockPrisma = {
      symbol: {
        findMany: async (args) => {
          capturedSymbolQuery = args;
          return [
            { id: "sym-login", name: "login", type: "METHOD" },
          ];
        },
      },
    };

    const service = new AiContextService({
      prisma: mockPrisma,
      nodeService: mockNodeService,
    });

    const context = await service.assembleNodeContext("node-auth");

    assert.equal(context.id, "node-auth");
    assert.equal(context.label, "AuthService");
    assert.equal(context.kind, "class");

    // Verify Symbol query uses `type` and NOT `kind`
    assert.ok(capturedSymbolQuery);
    assert.equal(capturedSymbolQuery.select.type, true);
    assert.equal(capturedSymbolQuery.select.kind, undefined, "Must NOT select unknown field 'kind' on Symbol");

    assert.equal(context.containedSymbols.length, 1);
    assert.equal(context.containedSymbols[0].name, "login");
    assert.equal(context.containedSymbols[0].kind, "METHOD");
    assert.equal(context.containedSymbols[0].type, "METHOD");
    assert.equal(context.dependsOn.length, 2);
    assert.equal(context.usedBy.length, 1);
  });

  it("assembles structured node entity context for File nodes using valid Symbol.type field", async () => {
    let capturedSymbolQuery = null;

    const mockNodeService = {
      getNodeRelationships: async (nodeId) => ({
        node: {
          id: nodeId,
          label: "app.ts",
          type: "file",
          entityType: "File",
          data: { name: "app.ts", filePath: "src/app.ts", loc: 250 },
        },
        outgoing: [],
        incoming: [],
      }),
    };

    const mockPrisma = {
      symbol: {
        findMany: async (args) => {
          capturedSymbolQuery = args;
          return [
            { id: "sym-init", name: "initializeApp", type: "FUNCTION" },
            { id: "sym-router", name: "apiRouter", type: "VARIABLE" },
          ];
        },
      },
    };

    const service = new AiContextService({
      prisma: mockPrisma,
      nodeService: mockNodeService,
    });

    const context = await service.assembleNodeContext("file-app");

    assert.equal(context.id, "file-app");
    assert.equal(context.label, "app.ts");
    assert.ok(capturedSymbolQuery);
    assert.equal(capturedSymbolQuery.select.type, true);
    assert.equal(capturedSymbolQuery.select.kind, undefined, "Must NOT select unknown field 'kind' on Symbol");

    assert.equal(context.containedSymbols.length, 2);
    assert.equal(context.containedSymbols[0].name, "initializeApp");
    assert.equal(context.containedSymbols[0].kind, "FUNCTION");
    assert.equal(context.containedSymbols[1].name, "apiRouter");
    assert.equal(context.containedSymbols[1].kind, "VARIABLE");
  });

  it("normalizes structured flow trace payload into bounded AI facts", () => {
    const service = new AiContextService();
    const normalized = service.normalizeFlowContext({
      flow: {
        id: "flow-checkout",
        name: "Checkout Process",
        steps: [
          { nodeId: "Cart.tsx", label: "Cart.tsx", kind: "component", path: "src/Cart.tsx" },
          { nodeId: "pay()", label: "pay()", kind: "function", path: "src/pay.ts", relationshipType: "CALLS", detail: "Charges card" },
        ],
      },
    });

    assert.equal(normalized.id, "flow-checkout");
    assert.equal(normalized.name, "Checkout Process");
    assert.equal(normalized.steps.length, 2);
    assert.equal(normalized.steps[0].label, "Cart.tsx");
    assert.equal(normalized.steps[1].relationshipType, "CALLS");
  });
});
