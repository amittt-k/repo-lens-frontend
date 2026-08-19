import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AstService } from "../src/services/ast.service.js";
import { OrchestratorService } from "../src/services/orchestrator.service.js";
import { parseSourceCode } from "../src/analyzers/javascript/astAnalyzer.js";

describe("Phase 25 Performance Remediation Tests", () => {
  describe("PERF-001: AST Parse De-duplication and Batch Symbol Persistence", () => {
    it("batches symbol persistence across all files in a single operation", async () => {
      const deletedRepos = [];
      const createdRecords = [];

      const mockDb = {
        symbol: {
          deleteMany: async (args) => {
            deletedRepos.push(args);
            return { count: 1 };
          },
          createMany: async (args) => {
            createdRecords.push(...args.data);
            return { count: args.data.length };
          },
        },
      };

      const astService = new AstService({ prisma: mockDb });

      const allSymbols = [
        { fileId: "f1", name: "login", type: "FUNCTION", startLine: 1, endLine: 10 },
        { fileId: "f1", name: "logout", type: "FUNCTION", startLine: 12, endLine: 20 },
        { fileId: "f2", name: "User", type: "CLASS", startLine: 1, endLine: 50 },
      ];

      const result = await astService.persistRepositorySymbols("repo-123", allSymbols);

      assert.equal(result.count, 3);
      assert.equal(deletedRepos.length, 1);
      assert.deepEqual(deletedRepos[0], { where: { file: { repositoryId: "repo-123" } } });
      assert.equal(createdRecords.length, 3);
    });

    it("verifies single AST parse pass per file in the orchestration pipeline", async () => {
      let parseCount = 0;
      const sampleCode = `
        import express from "express";
        const router = express.Router();
        export function helper() { return 42; }
        router.get("/data", (req, res) => { res.json({ value: helper() }); });
      `;

      // Mock AstService to count analyzeFile calls and supply AST
      const mockAstService = {
        analyzeFile: (path, content) => {
          parseCount++;
          const ast = parseSourceCode(content);
          return {
            filePath: path,
            isSupported: true,
            success: true,
            error: null,
            ast,
            symbols: [{ name: "helper", type: "FUNCTION", startLine: 4, endLine: 4 }],
            imports: [{ source: "express", specifiers: [{ name: "express", type: "default" }] }],
            exports: [{ name: "helper", type: "named" }],
          };
        },
        persistRepositorySymbols: async () => ({ count: 1 }),
      };

      const mockDependencyService = {
        persistDependencies: async () => ({ count: 0 }),
      };

      const mockRelationshipService = {
        persistSymbolRelationships: async () => ({ count: 0 }),
      };

      const mockApiRouteService = {
        persistApiRoutes: async () => ({ count: 1 }),
      };

      const mockDb = {
        repository: {
          findUnique: async () => ({ id: "repo-perf", owner: "test", name: "perf" }),
        },
        analysis: {
          create: async () => ({ id: "analysis-perf", status: "ANALYZING" }),
          update: async (args) => ({ id: "analysis-perf", status: args.data.status, metadata: args.data.metadata }),
        },
        file: {
          findMany: async () => [
            { id: "f1", repositoryId: "repo-perf", path: "src/routes.js", type: "file" },
          ],
        },
      };

      const orchestrator = new OrchestratorService({
        prisma: mockDb,
        astService: mockAstService,
        dependencyService: mockDependencyService,
        relationshipService: mockRelationshipService,
        apiRouteService: mockApiRouteService,
      });

      const result = await orchestrator.analyzeRepository("repo-perf", {
        fileContents: {
          "src/routes.js": sampleCode,
        },
      });

      assert.equal(result.success, true);
      assert.equal(parseCount, 1, "Expected exactly 1 AST parse for the file during analysis");
      assert.equal(result.analysis.stats.totalSymbols, 1);
      assert.equal(result.analysis.stats.totalRoutes, 1);
    });
  });
});
