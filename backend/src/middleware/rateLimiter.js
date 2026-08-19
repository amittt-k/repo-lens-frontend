/**
 * In-Memory Sliding Window Rate Limiter Middleware.
 *
 * Protects expensive public endpoints (repository ingestion, analysis, AI completions)
 * against abusive request volume and resource exhaustion without external infrastructure.
 */

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // Default: 1 minute
  const max = options.max || 60; // Default: 60 requests per window
  const message = options.message || "Too many requests. Please try again later.";
  const hits = new Map();

  // Periodically clean up expired bucket entries to prevent memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 30000));

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const key = `${options.name || "default"}:${ip}`;
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      hits.set(key, record);
    }

    record.count++;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        status: "error",
        statusCode: 429,
        message,
      });
    }

    next();
  };
}

export default createRateLimiter;
