import { Router } from "express";
import healthRoutes from "./health.routes.js";
import repositoryRoutes from "./repository.routes.js";
import nodeRoutes from "./node.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/repositories", repositoryRoutes);
apiRouter.use("/nodes", nodeRoutes);

export default apiRouter;


