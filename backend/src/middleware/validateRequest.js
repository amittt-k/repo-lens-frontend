/**
 * Higher-order middleware to validate request data against custom validator functions.
 * @param {Function} validatorFn - Function receiving req that throws or returns error message if invalid.
 */
export function validateRequest(validatorFn) {
  return (req, res, next) => {
    try {
      const error = validatorFn(req);
      if (error) {
        return res.status(400).json({
          status: "error",
          statusCode: 400,
          message: error,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validateRequest;
