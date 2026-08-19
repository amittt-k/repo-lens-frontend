/**
 * Controller for AI explanation endpoints.
 *
 * Handles HTTP requests, delegates structured fact aggregation to AiContextService,
 * and delegates prompt generation and LLM execution to AiService.
 */

import prisma from "../config/database.js";
import { AiService, aiService as defaultAiService } from "../services/ai.service.js";
import { NodeService, nodeService as defaultNodeService } from "../services/node.service.js";
import { AiContextService, aiContextService as defaultAiContextService } from "../services/aiContext.service.js";

export class AiController {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
    this.aiService = options.aiService || defaultAiService;
    this.nodeService = options.nodeService || (options.prisma ? new NodeService({ prisma: this.db }) : defaultNodeService);
    this.contextService =
      options.contextService ||
      (options.prisma || options.nodeService
        ? new AiContextService({ prisma: this.db, nodeService: this.nodeService })
        : defaultAiContextService);
  }

  /**
   * POST /api/ai/explain/repository
   * Generates a grounded architectural overview for a repository.
   */
  async explainRepository(req, res, next) {
    try {
      const { repositoryId } = req.body;

      const analysisData = await this.contextService.assembleRepositoryContext(repositoryId, {
        prisma: this.db,
      });
      if (!analysisData) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: `Repository with ID "${repositoryId}" not found.`,
        });
      }

      const result = await this.aiService.explainRepository(analysisData);

      return res.status(200).json({
        success: true,
        repositoryId: analysisData.repository.id,
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

      const nodeData = await this.contextService.assembleNodeContext(nodeId, {
        prisma: this.db,
        nodeService: this.nodeService,
      });
      const result = await this.aiService.explainNode(nodeData);

      return res.status(200).json({
        success: true,
        nodeId: nodeData.id,
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
      const flowData = this.contextService.normalizeFlowContext(req.body);
      const result = await this.aiService.explainFlow(flowData);

      return res.status(200).json({
        success: true,
        flowId: flowData.id,
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
