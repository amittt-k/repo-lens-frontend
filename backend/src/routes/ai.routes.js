import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

function validateExplainRepository(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return "Request body is required and must be an object.";
  }
  const { repositoryId } = req.body;
  if (!repositoryId || typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    return "repositoryId is required and must be a non-empty string.";
  }
  return null;
}

function validateExplainNode(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return "Request body is required and must be an object.";
  }
  const { nodeId } = req.body;
  if (!nodeId || typeof nodeId !== "string" || nodeId.trim().length === 0) {
    return "nodeId is required and must be a non-empty string.";
  }
  return null;
}

router.post(
  "/explain/repository",
  validateRequest(validateExplainRepository),
  (req, res, next) => aiController.explainRepository(req, res, next),
);

router.post(
  "/explain/node",
  validateRequest(validateExplainNode),
  (req, res, next) => aiController.explainNode(req, res, next),
);

export default router;
