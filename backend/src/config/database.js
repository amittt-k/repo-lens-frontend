import { PrismaClient } from "@prisma/client";
import config from "./env.js";

const prisma = new PrismaClient({
  log: config.isProduction ? ["error"] : ["query", "error", "warn"],
});

export default prisma;
