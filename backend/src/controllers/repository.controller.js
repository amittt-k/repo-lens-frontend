import githubService from "../services/github.service.js";

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
}

export const repositoryController = new RepositoryController();
export default repositoryController;
