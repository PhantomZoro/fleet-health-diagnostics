import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(DiagnosticEvent);
  const events = await repo.count();
  res.json({ status: 'ok', events });
});
