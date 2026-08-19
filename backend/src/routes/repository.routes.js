import { Router } from "express";
import repositoryController from "../controllers/repository.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

const analysisLimiter = createRateLimiter({
  name: "analysis",
  windowMs: 60 * 1000,
  max: 60, // 60 analysis/ingestion requests per minute per IP
  message: "Too many repository analysis requests. Please try again in a moment.",
});

const validateUrlPayload = validateRequest((req) => {
  if (!req.body || typeof req.body !== "object") {
    return "Request body must be a JSON object.";
  }
  if (!req.body.url || typeof req.body.url !== "string" || !req.body.url.trim()) {
    return 'Field "url" is required and must be a non-empty string.';
  }
  return null;
});

router.post("/validate", analysisLimiter, validateUrlPayload, (req, res, next) => {
  repositoryController.validateRepository(req, res, next);
});

router.post("/ingest", analysisLimiter, validateUrlPayload, (req, res, next) => {
  repositoryController.ingestRepository(req, res, next);
});

router.post("/analyze", analysisLimiter, validateUrlPayload, (req, res, next) => {
  repositoryController.analyzeAndIngest(req, res, next);
});

router.get("/:id", (req, res, next) => {
  repositoryController.getRepository(req, res, next);
});

router.get("/:id/files", (req, res, next) => {
  repositoryController.getFileTree(req, res, next);
});

router.get("/:id/tree", (req, res, next) => {
  repositoryController.getFileTree(req, res, next);
});

router.post("/:id/analyze", analysisLimiter, (req, res, next) => {
  repositoryController.analyzeRepository(req, res, next);
});

router.get("/:id/graph", (req, res, next) => {
  repositoryController.getGraph(req, res, next);
});

router.get("/:id/relationships", (req, res, next) => {
  repositoryController.getRelationships(req, res, next);
});

router.get("/:id/routes", (req, res, next) => {
  repositoryController.getRoutes(req, res, next);
});

export default router;




