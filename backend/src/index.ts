import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database.js';
import { seedDatabase } from './seed/seed-runner.js';
import { healthRouter } from './routes/health.router.js';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected');

  await seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);

  const PORT = process.env['PORT'] ?? 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
