import githubService from "../services/github.service.js";
import ingestionService from "../services/ingestion.service.js";
import fileTreeService from "../services/fileTree.service.js";
import orchestratorService from "../services/orchestrator.service.js";
import graphService from "../services/graph.service.js";
import prisma from "../config/database.js";

export class RepositoryController {
  async validateRepository(req, res, next) {
    try {
      const { url } = req.body;
      const result = await githubService.validateAndFetchRepository(url);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async ingestRepository(req, res, next) {
    try {
      const { url } = req.body;
      const result = await ingestionService.ingestRepository(url);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getRepository(req, res, next) {
    try {
      const { id } = req.params;
      const repository = await prisma.repository.findUnique({
        where: { id },
        include: {
          analyses: {
            orderBy: { startedAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              files: true,
              relationships: true,
              apiRoutes: true,
            },
          },
        },
      });
      if (!repository) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: `Repository with ID "${id}" not found.`,
        });
      }
      return res.status(200).json({
        success: true,
        repository,
      });
    } catch (err) {
      next(err);
    }
  }

  async analyzeAndIngest(req, res, next) {
    try {
      const { url } = req.body;
      // 1. Ingest repository (handles GitHub validation, ingestion, file creation)
      const ingestResult = await ingestionService.ingestRepository(url);
      const repositoryId = ingestResult.repository.id;

      // 2. Orchestrate complete static analysis pipeline (server-controlled analysis only)
      const analysisResult = await orchestratorService.analyzeRepository(repositoryId, {});

      return res.status(200).json({
        success: true,
        repository: ingestResult.repository,
        analysis: analysisResult.analysis,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRelationships(req, res, next) {
    try {
      const { id } = req.params;
      const repository = await prisma.repository.findUnique({
        where: { id },
      });
      if (!repository) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: `Repository with ID "${id}" not found.`,
        });
      }

      const validRelTypes = new Set([
        "IMPORTS",
        "CONTAINS",
        "CALLS",
        "USES",
        "EXTENDS",
        "IMPLEMENTS",
        "HANDLES_ROUTE",
        "CALLS_API",
      ]);

      const typeFilter = req.query.type || req.query.relationshipType;
      if (typeFilter) {
        const types = typeFilter.split(",").map((t) => t.trim().toUpperCase());
        const invalidType = types.find((t) => !validRelTypes.has(t));
        if (invalidType) {
          return res.status(400).json({
            status: "error",
            statusCode: 400,
            message: `Invalid relationship type "${invalidType}". Valid types are: ${Array.from(validRelTypes).join(", ")}.`,
          });
        }
      }

      const whereClause = { repositoryId: id };
      if (typeFilter) {
        const types = typeFilter.split(",").map((t) => t.trim().toUpperCase());
        whereClause.relationshipType = types.length === 1 ? types[0] : { in: types };
      }

      const relationships = await prisma.relationship.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
      });

      return res.status(200).json({
        success: true,
        repositoryId: id,
        total: relationships.length,
        relationships,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRoutes(req, res, next) {
    try {
      const { id } = req.params;
      const repository = await prisma.repository.findUnique({
        where: { id },
      });
      if (!repository) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: `Repository with ID "${id}" not found.`,
        });
      }

      const routes = await prisma.apiRoute.findMany({
        where: { repositoryId: id },
        orderBy: [{ path: "asc" }, { method: "asc" }],
      });

      return res.status(200).json({
        success: true,
        repositoryId: id,
        total: routes.length,
        routes,
      });
    } catch (err) {
      next(err);
    }
  }


  async getFileTree(req, res, next) {
    try {
      const { id } = req.params;
      const result = await fileTreeService.getRepositoryFileTree(id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async analyzeRepository(req, res, next) {
    try {
      const { id } = req.params;
      const result = await orchestratorService.analyzeRepository(id, {});
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getGraph(req, res, next) {
    try {
      const { id } = req.params;
      const result = await graphService.getRepositoryGraph(id, req.query || {});
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const repositoryController = new RepositoryController();
export default repositoryController;




