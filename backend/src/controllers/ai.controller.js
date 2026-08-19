/**
 * Controller for AI explanation endpoints.
 *
 * Handles HTTP requests by gathering structured analysis facts from the database
 * and delegating prompt generation and LLM execution to AiService.
 */

import prisma from "../config/database.js";
import { AiService, aiService as defaultAiService } from "../services/ai.service.js";
import { NodeService, nodeService as defaultNodeService } from "../services/node.service.js";

export class AiController {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
    this.aiService = options.aiService || defaultAiService;
    this.nodeService = options.nodeService || (options.prisma ? new NodeService({ prisma: this.db }) : defaultNodeService);
  }

  /**
   * POST /api/ai/explain/repository
   * Generates a grounded architectural overview for a repository.
   */
  async explainRepository(req, res, next) {
    try {
      const { repositoryId } = req.body;

      // 1. Retrieve repository
      const repository = await this.db.repository.findUnique({
        where: { id: repositoryId },
      });

      if (!repository) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: `Repository with ID "${repositoryId}" not found.`,
        });
      }

      // 2. Retrieve latest analysis record
      const latestAnalysis = await this.db.analysis.findFirst({
        where: { repositoryId },
        orderBy: { startedAt: "desc" },
      });

      // 3. Retrieve files
      const files = await this.db.file.findMany({
        where: { repositoryId },
        select: { id: true, path: true, size: true },
      });

      // 4. Retrieve API routes
      const routes = await this.db.apiRoute.findMany({
        where: { repositoryId },
        orderBy: [{ path: "asc" }, { method: "asc" }],
      });

      // 5. Retrieve key symbols
      const symbols = await this.db.symbol.findMany({
        where: { file: { repositoryId } },
        take: 50,
        select: { id: true, name: true, kind: true, filePath: true },
      });

      // 6. Retrieve relationship count
      const relationshipsCount = await this.db.relationship.count({
        where: { repositoryId },
      });

      // 7. Aggregate structured repository context for AI
      const analysisData = {
        repository: {
          id: repository.id,
          name: repository.name,
          owner: repository.owner,
          fullName: `${repository.owner}/${repository.name}`,
          description: repository.description,
          language: repository.language,
          defaultBranch: repository.defaultBranch,
        },
        analysisId: latestAnalysis?.id || null,
        fileCount: files.length,
        files: files.slice(0, 100).map((f) => ({ path: f.path, size: f.size })),
        apiRoutes: routes.map((r) => ({
          method: r.method,
          path: r.path,
          handler: r.handler,
          filePath: r.filePath,
        })),
        symbols: symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          filePath: s.filePath,
        })),
        totalRelationships: relationshipsCount,
        metrics: latestAnalysis?.metadata || {},
      };

      // 8. Invoke AI service
      const result = await this.aiService.explainRepository(analysisData);

      return res.status(200).json({
        success: true,
        repositoryId: repository.id,
        explanation: result.explanation,
        model: result.model,
        usage: result.usage || null,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/explain/node
   * Generates a grounded technical explanation for a specific AST symbol or file node.
   */
  async explainNode(req, res, next) {
    try {
      const { nodeId } = req.body;

      // 1. Resolve node entity and its direct relationships
      const relData = await this.nodeService.getNodeRelationships(nodeId);
      const { node, outgoing, incoming } = relData;

      // 2. Retrieve contained symbols where applicable
      let containedSymbols = [];
      if (node.entityType === "File") {
        containedSymbols = await this.db.symbol.findMany({
          where: { fileId: node.id },
          select: { id: true, name: true, kind: true },
          take: 30,
        });
      } else if (node.type === "class") {
        // Find member methods or contained symbols from outgoing CONTAINS relationships
        const containedRels = outgoing.filter((r) => r.relationshipType === "CONTAINS");
        if (containedRels.length > 0) {
          containedSymbols = await this.db.symbol.findMany({
            where: { id: { in: containedRels.map((r) => r.targetId) } },
            select: { id: true, name: true, kind: true },
            take: 30,
          });
        }
      }

      // 3. Construct structured node context for AI
      const nodeData = {
        id: node.id,
        label: node.label,
        name: node.data?.name || node.label,
        kind: node.type || node.data?.kind || "symbol",
        path: node.data?.filePath || "",
        startLine: node.data?.startLine,
        endLine: node.data?.endLine,
        loc:
          node.data?.loc ||
          (node.data?.endLine && node.data?.startLine
            ? node.data.endLine - node.data.startLine + 1
            : undefined),
        containedSymbols: containedSymbols.map((s) => ({
          name: s.name,
          kind: s.kind,
        })),
        dependsOn: outgoing.map((r) => ({
          relationshipType: r.relationshipType,
          targetId: r.targetId,
        })),
        usedBy: incoming.map((r) => ({
          relationshipType: r.relationshipType,
          sourceId: r.sourceId,
        })),
        apiRoute:
          node.type === "api_route"
            ? {
                method: node.data?.method,
                path: node.data?.path,
                handler: node.data?.handler,
              }
            : undefined,
      };

      // 4. Invoke AI service
      const result = await this.aiService.explainNode(nodeData);

      return res.status(200).json({
        success: true,
        nodeId: node.id,
        explanation: result.explanation,
        model: result.model,
        usage: result.usage || null,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/explain/flow
   * Generates a grounded technical explanation for a deterministic application flow trace.
   */
  async explainFlow(req, res, next) {
    try {
      const rawFlow = req.body.flow || {};
      const rawSteps = Array.isArray(req.body.steps) ? req.body.steps : rawFlow.steps || [];
      const flowId = rawFlow.id || req.body.flowId || null;
      const name = rawFlow.name || req.body.name || (rawSteps[0]?.label ? `Flow: ${rawSteps[0].label}` : "Flow Trace");
      const startNodeId = rawFlow.startNodeId || req.body.startNodeId || rawSteps[0]?.nodeId || null;

      // 1. Normalize structured flow trace facts
      const flowData = {
        id: flowId,
        name,
        startNodeId,
        steps: rawSteps.map((s) => ({
          nodeId: s.nodeId || s.id,
          label: s.label || s.name || "Unknown Step",
          kind: s.kind || s.type || "module",
          path: s.path || s.filePath || "",
          relationshipType: s.relationshipType || s.relation,
          detail: s.detail || "",
        })),
      };

      // 2. Invoke AI service
      const result = await this.aiService.explainFlow(flowData);

      return res.status(200).json({
        success: true,
        flowId,
        explanation: result.explanation,
        model: result.model,
        usage: result.usage || null,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
export default aiController;
