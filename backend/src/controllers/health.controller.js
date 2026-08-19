import healthService from "../services/health.service.js";

export class HealthController {
  getHealth(req, res) {
    const health = healthService.getHealthStatus();
    return res.status(200).json(health);
  }
}

export const healthController = new HealthController();
export default healthController;
