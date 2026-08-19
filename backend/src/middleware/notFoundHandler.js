export function notFoundHandler(req, res) {
  res.status(404).json({
    status: "error",
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export default notFoundHandler;
