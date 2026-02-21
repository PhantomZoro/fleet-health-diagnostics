import { DataSource } from 'typeorm';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: 'data/fleet.db',
  synchronize: true,
  logging: false,
  entities: [DiagnosticEvent],
  subscribers: [],
  migrations: [],
});
