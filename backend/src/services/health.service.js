import config from "../config/env.js";

export class HealthService {
  getHealthStatus() {
    return {
      status: "ok",
      message: "RepoLens backend is running",
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: process.uptime(),
    };
  }
}

export const healthService = new HealthService();
export default healthService;
