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

    req.query = result.data as typeof req.query;
    next();
  };
}

export const eventsQuerySchema = z.object({
  vehicleId: z.string().optional(),
  code: z.string().optional(),
  level: z.enum(['ERROR', 'WARN', 'INFO']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
