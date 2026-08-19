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
      const result = await orchestratorService.analyzeRepository(id, req.body || {});
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




