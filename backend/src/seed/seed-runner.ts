import { readFileSync } from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database.js';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';
import { parseLogFile } from '../parser/log-parser.js';
import { ParsedLogEntry } from '../types/index.js';

const CHUNK_SIZE = 100;

export async function seedDatabase(): Promise<void> {
  const repo = AppDataSource.getRepository(DiagnosticEvent);

  // Count guard — skip if already seeded
  const count = await repo.count();
  if (count > 0) {
    console.log(`Database already seeded (${count} events)`);
    return;
  }

  // Read and parse seed log relative to backend/ working directory
  const seedPath = path.join(process.cwd(), 'data', 'seed.log');
  const content = readFileSync(seedPath, 'utf-8');
  const entries: ParsedLogEntry[] = parseLogFile(content);

  // Map ParsedLogEntry[] to DiagnosticEvent[]
  const events: DiagnosticEvent[] = entries.map((entry) => {
    const event = new DiagnosticEvent();
    event.timestamp = entry.timestamp;
    event.vehicleId = entry.vehicleId;
    event.level = entry.level;
    event.code = entry.code;
    event.message = entry.message;
    return event;
  });

  // Bulk insert in chunks to avoid SQLite max variable limits
  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    const chunk = events.slice(i, i + CHUNK_SIZE);
    await repo.save(chunk);
  }

  console.log(`Seeded ${events.length} diagnostic events`);
}
