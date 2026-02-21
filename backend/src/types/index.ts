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
