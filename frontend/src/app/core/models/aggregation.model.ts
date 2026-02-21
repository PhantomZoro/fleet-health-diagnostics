import { DiagnosticLevel } from './diagnostic-event.model';

export interface ErrorsPerVehicle {
  vehicleId: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  total: number;
}

export interface TopCode {
  code: string;
  count: number;
  level: DiagnosticLevel;
}

export interface CriticalVehicle {
  vehicleId: string;
  errorCount: number;
  latestError: string;  // ISO date string
}
