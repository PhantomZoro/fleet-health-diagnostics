import { Router } from 'express';
import { z } from 'zod';
import { VehicleService } from '../services/vehicle.service.js';
import { validateParams } from '../middleware/validate.js';

export const vehiclesRouter = Router();

const vehicleIdParamsSchema = z.object({
  vehicleId: z.string().min(1),
});

/**
 * @openapi
 * /api/vehicles/{vehicleId}/summary:
 *   get:
 *     summary: Get a detailed summary for a specific vehicle
 *     tags:
 *       - Vehicles
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The vehicle identifier (e.g. VH-1001)
 *     responses:
 *       200:
 *         description: Vehicle summary with counts, top codes, and recent events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicleId:
 *                   type: string
 *                 errorCount:
 *                   type: integer
 *                 warnCount:
 *                   type: integer
 *                 infoCount:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 firstSeen:
 *                   type: string
 *                   format: date-time
 *                 lastSeen:
 *                   type: string
 *                   format: date-time
 *                 topCodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       level:
 *                         type: string
 *                         enum: [ERROR, WARN, INFO]
 *                 recentEvents:
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
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
vehiclesRouter.get(
  '/api/vehicles/:vehicleId/summary',
  validateParams(vehicleIdParamsSchema),
  async (_req, res) => {
    const { vehicleId } = res.locals.validatedParams as { vehicleId: string };
    const summary = await VehicleService.getVehicleSummary(vehicleId);

    if (!summary) {
      res.status(404).json({ error: `Vehicle ${vehicleId} not found` });
      return;
    }

    res.json(summary);
  }
);
