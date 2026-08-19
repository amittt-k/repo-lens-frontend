import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AiContextService } from "../src/services/aiContext.service.js";

describe("AiContextService Unit Tests (QUALITY-002)", () => {
  it("assembles structured repository context from database", async () => {
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
        findMany: async () => [
          { method: "GET", path: "/api/repos", handler: "getRepos", filePath: "src/routes.ts" },
        ],
      },
      symbol: {
        findMany: async () => [
          { id: "s1", name: "getRepos", kind: "FUNCTION", filePath: "src/routes.ts" },
        ],
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
    assert.equal(context.symbols.length, 1);
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

  it("assembles structured node entity context including relationships and symbols", async () => {
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
        findMany: async () => [
          { id: "sym-login", name: "login", kind: "METHOD" },
        ],
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
    assert.equal(context.containedSymbols.length, 1);
    assert.equal(context.containedSymbols[0].name, "login");
    assert.equal(context.dependsOn.length, 2);
    assert.equal(context.usedBy.length, 1);
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
