import nodeService from "../services/node.service.js";

export class NodeController {
  async getNode(req, res, next) {
    try {
      const { id } = req.params;
      const node = await nodeService.getNodeById(id);
      return res.status(200).json({
        success: true,
        node,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNodeRelationships(req, res, next) {
    try {
      const { id } = req.params;
      const result = await nodeService.getNodeRelationships(id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const nodeController = new NodeController();
export default nodeController;
