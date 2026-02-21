import { DiagnosticLevel } from './diagnostic-event.model';

export interface EventFilters {
  vehicleId?: string;
  code?: string;
  level?: DiagnosticLevel;
  from?: string;  // ISO date string
  to?: string;    // ISO date string
}
