export type DiagnosticLevel = 'ERROR' | 'WARN' | 'INFO';

export interface ParsedLogEntry {
  timestamp: Date;
  vehicleId: string;
  level: DiagnosticLevel;
  code: string;
  message: string;
}
