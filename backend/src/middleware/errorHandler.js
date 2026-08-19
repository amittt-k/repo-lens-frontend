import config from "../config/env.js";

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 404 ? res.statusCode : 500);
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

export default errorHandler;
