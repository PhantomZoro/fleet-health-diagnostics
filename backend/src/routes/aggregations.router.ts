import { Router } from 'express';
import { z } from 'zod';
import { AggregationService } from '../services/aggregation.service.js';
import { validateQuery } from '../middleware/validate.js';
import type { AggregationTimeRange, DiagnosticLevel } from '../types/index.js';

export const aggregationsRouter = Router();

const timeRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const topCodesSchema = timeRangeSchema.extend({
  level: z.enum(['ERROR', 'WARN', 'INFO']).optional(),
});

/**
 * @openapi
 * /api/aggregations/errors-per-vehicle:
 *   get:
 *     summary: Get error counts grouped by vehicle
 *     tags:
 *       - Aggregations
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of time range (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of time range (ISO 8601)
 *     responses:
 *       200:
 *         description: Per-vehicle event counts broken down by severity
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   vehicleId:
 *                     type: string
 *                   errorCount:
 *                     type: integer
 *                   warnCount:
 *                     type: integer
 *                   infoCount:
 *                     type: integer
 *                   total:
 *                     type: integer
 */
aggregationsRouter.get(
  '/api/aggregations/errors-per-vehicle',
  validateQuery(timeRangeSchema),
  async (_req, res) => {
    const params = res.locals.validated as AggregationTimeRange;
    const result = await AggregationService.errorsPerVehicle(params);
    res.json(result);
  }
);

/**
 * @openapi
 * /api/aggregations/top-codes:
 *   get:
 *     summary: Get top 10 most frequent diagnostic codes
 *     tags:
 *       - Aggregations
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [ERROR, WARN, INFO]
 *         description: Filter by severity level
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of time range (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of time range (ISO 8601)
 *     responses:
 *       200:
 *         description: Top diagnostic codes by frequency
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   count:
 *                     type: integer
 *                   level:
 *                     type: string
 *                     enum: [ERROR, WARN, INFO]
 */
aggregationsRouter.get(
  '/api/aggregations/top-codes',
  validateQuery(topCodesSchema),
  async (_req, res) => {
    const params = res.locals.validated as {
      level?: DiagnosticLevel;
    } & AggregationTimeRange;
    const result = await AggregationService.topCodes(params);
    res.json(result);
  }
);

/**
 * @openapi
 * /api/aggregations/critical-vehicles:
 *   get:
 *     summary: Get vehicles with 3+ ERROR events in the last 24 hours
 *     tags:
 *       - Aggregations
 *     responses:
 *       200:
 *         description: Critical vehicles (3+ errors in 24h window relative to latest event)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   vehicleId:
 *                     type: string
 *                   errorCount:
 *                     type: integer
 *                   latestError:
 *                     type: string
 *                     format: date-time
 */
aggregationsRouter.get(
  '/api/aggregations/critical-vehicles',
  async (_req, res) => {
    const result = await AggregationService.criticalVehicles();
    res.json(result);
  }
);
