import { Router } from "express";
import nodeController from "../controllers/node.controller.js";

const router = Router();

router.get("/:id", (req, res, next) => {
  nodeController.getNode(req, res, next);
});

router.get("/:id/relationships", (req, res, next) => {
  nodeController.getNodeRelationships(req, res, next);
});

export default router;
