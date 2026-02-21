export type DiagnosticLevel = 'ERROR' | 'WARN' | 'INFO';

export interface ParsedLogEntry {
  timestamp: Date;
  vehicleId: string;
  level: DiagnosticLevel;
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface EventQueryParams {
  vehicleId?: string;
  code?: string;
  level?: DiagnosticLevel;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

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
  latestError: string;
}

export interface AggregationTimeRange {
  from?: string;
  to?: string;
}
