import config from "../config/env.js";

function sanitizeErrorMessage(msg) {
  if (typeof msg !== "string") return "An error occurred.";
  return msg
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_SECRET]")
    .replace(/ghp_[a-zA-Z0-9]{20,}/g, "[REDACTED_SECRET]")
    .replace(/(?:[a-zA-Z]:|\/home|\/Users|\/var|\/tmp)[^\s:'"]+/g, "[REDACTED_PATH]");
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 404 ? res.statusCode : 500);
  
  // In production, mask unexpected 500 internal errors to avoid leaking database/system internals
  let message = err.message || "Internal Server Error";
  if (statusCode >= 500 && config.isProduction) {
    message = "An unexpected internal server error occurred.";
  } else {
    message = sanitizeErrorMessage(message);
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

export default errorHandler;
