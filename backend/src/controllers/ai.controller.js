/**
 * Controller for AI explanation endpoints.
 *
 * Handles HTTP requests by gathering structured analysis facts from the database
 * and delegating prompt generation and LLM execution to AiService.
 */

import prisma from "../config/database.js";
import { AiService, aiService as defaultAiService } from "../services/ai.service.js";

export class AiController {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
    this.aiService = options.aiService || defaultAiService;
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
}

export const aiController = new AiController();
export default aiController;
