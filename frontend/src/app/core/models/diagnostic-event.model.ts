export type DiagnosticLevel = 'ERROR' | 'WARN' | 'INFO';
export type EventSortField = 'timestamp' | 'vehicleId' | 'level' | 'code';
export type SortOrder = 'ASC' | 'DESC';

export interface DiagnosticEvent {
  id: number;
  timestamp: string;  // ISO string from JSON serialization
  vehicleId: string;
  level: DiagnosticLevel;
  code: string;
  message: string;
}
