import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database.js';
import { seedDatabase } from './seed/seed-runner.js';
import { healthRouter } from './routes/health.router.js';
import { eventsRouter } from './routes/events.router.js';
import { aggregationsRouter } from './routes/aggregations.router.js';
import { vehiclesRouter } from './routes/vehicles.router.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected');

  await seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use(eventsRouter);
  app.use(aggregationsRouter);
  app.use(vehiclesRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env['PORT'] ?? 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
