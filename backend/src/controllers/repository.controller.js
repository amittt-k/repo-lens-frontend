import githubService from "../services/github.service.js";
import ingestionService from "../services/ingestion.service.js";

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
}

export const repositoryController = new RepositoryController();
export default repositoryController;

