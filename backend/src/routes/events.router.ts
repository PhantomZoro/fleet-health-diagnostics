import { Router } from 'express';
import { EventService } from '../services/event.service.js';
import { validateQuery, eventsQuerySchema } from '../middleware/validate.js';
import type { EventQueryParams } from '../types/index.js';

export const eventsRouter = Router();

/**
 * @openapi
 * /api/events:
 *   get:
 *     summary: Query diagnostic events with filters and pagination
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *         description: Filter by vehicle ID (exact match)
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Filter by diagnostic code (exact match)
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [timestamp, vehicleId, level, code]
 *         description: Field to sort results by (default timestamp)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Paginated list of diagnostic events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       vehicleId:
 *                         type: string
 *                       level:
 *                         type: string
 *                         enum: [ERROR, WARN, INFO]
 *                       code:
 *                         type: string
 *                       message:
 *                         type: string
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 */
eventsRouter.get(
  '/api/events',
  validateQuery(eventsQuerySchema),
  async (_req, res) => {
    const params = res.locals.validated as EventQueryParams;
    const result = await EventService.queryEvents(params);
    res.json(result);
  }
);
