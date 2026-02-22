import {
  DiagnosticEvent,
  EventFilters,
  EventSortField,
  SortOrder,
  ErrorsPerVehicle,
  TopCode,
  CriticalVehicle
} from '../core/models';

export interface AggregationState {
  errorsPerVehicle: ErrorsPerVehicle[];
  topCodes: TopCode[];
  criticalVehicles: CriticalVehicle[];
}

export interface DiagnosticsState {
  filters: EventFilters;
  events: DiagnosticEvent[];
  total: number;
  page: number;
  limit: number;
  sortBy: EventSortField;
  sortOrder: SortOrder;
  aggregations: AggregationState;
  loading: boolean;
  error: string | null;
}

export const initialState: DiagnosticsState = {
  filters: {},
  events: [],
  total: 0,
  page: 1,
  limit: 20,
  sortBy: 'timestamp',
  sortOrder: 'DESC',
  aggregations: {
    errorsPerVehicle: [],
    topCodes: [],
    criticalVehicles: []
  },
  loading: false,
  error: null
};
