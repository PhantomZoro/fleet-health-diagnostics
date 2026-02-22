import { z } from 'zod';
import type { RequestHandler } from 'express';

export function validateQuery(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    res.locals.validated = result.data;
    next();
  };
}

export function validateParams(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    res.locals.validatedParams = result.data;
    next();
  };
}

export const eventsQuerySchema = z.object({
  vehicleId: z.string().optional(),
  code: z.string().optional(),
  level: z.string().transform(v => v.toUpperCase()).pipe(z.enum(['ERROR', 'WARN', 'INFO'])).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['timestamp', 'vehicleId', 'level', 'code']).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});
