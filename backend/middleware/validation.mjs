import { ZodError } from 'zod'

export const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: e.errors.map((err) => ({ path: err.path.join('.'), message: err.message })),
      })
    }
    next(e)
  }
}
