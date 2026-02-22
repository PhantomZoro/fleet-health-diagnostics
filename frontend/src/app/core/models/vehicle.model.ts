import { DiagnosticEvent, DiagnosticLevel } from './diagnostic-event.model';

export type VehicleHealthStatus = 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface VehicleTopCode {
  code: string;
  count: number;
  level: DiagnosticLevel;
}

export interface VehicleSummary {
  vehicleId: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  total: number;
  firstSeen: string;
  lastSeen: string;
  topCodes: VehicleTopCode[];
  recentEvents: DiagnosticEvent[];
}

export interface VehicleCard {
  vehicleId: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  total: number;
  healthStatus: VehicleHealthStatus;
}
