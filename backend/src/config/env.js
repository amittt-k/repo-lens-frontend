import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:3000"],
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/repolens?schema=public",
  ai: {
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "gpt-4o-mini",
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
    baseUrl: process.env.AI_BASE_URL || "",
  },
};


export default config;
