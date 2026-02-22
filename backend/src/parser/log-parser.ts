import { ParsedLogEntry } from '../types/index.js';

const LOG_LINE_REGEX =
  /^\[(.+?)\] \[VEHICLE_ID:([A-Z][A-Z0-9]+-\d{4})\] \[(ERROR|WARN|INFO)\] \[CODE:([A-Z]\d{4})\] (.+)$/;

/**
 * Parses a single structured log line into a ParsedLogEntry.
 * Returns null for comments, blank lines, or malformed entries.
 */
export function parseLogLine(line: string): ParsedLogEntry | null {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return null;
  }

  const match = LOG_LINE_REGEX.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, timestampStr, vehicleId, level, code, message] = match;

  return {
    timestamp: new Date(timestampStr),
    vehicleId,
    level: level as ParsedLogEntry['level'],
    code,
    message,
  };
}

/**
 * Parses a full log file content into an array of ParsedLogEntry objects.
 * Non-empty lines that fail to parse are skipped with a console.warn.
 */
export function parseLogFile(content: string): ParsedLogEntry[] {
  const lines = content.split('\n');
  const entries: ParsedLogEntry[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Skip blank lines and comment lines silently
    if (trimmed === '' || trimmed.startsWith('#')) {
      return;
    }

    const entry = parseLogLine(trimmed);
    if (entry === null) {
      console.warn(`Skipping malformed line ${index + 1}: ${trimmed.slice(0, 80)}...`);
      return;
    }

    entries.push(entry);
  });

  return entries;
}

export class LogParser {
  parseLine(line: string): ParsedLogEntry | null {
    return parseLogLine(line);
  }

  parseFile(content: string): ParsedLogEntry[] {
    return parseLogFile(content);
  }
}
