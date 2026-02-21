import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DiagnosticEvent,
  EventFilters,
  PaginatedResponse,
  ErrorsPerVehicle,
  TopCode,
  CriticalVehicle
} from '../models';

@Injectable({ providedIn: 'root' })
export class DiagnosticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getEvents(filters: EventFilters, page = 1, limit = 20): Observable<PaginatedResponse<DiagnosticEvent>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Only add filter params that have defined, non-empty values
    if (filters.vehicleId) params = params.set('vehicleId', filters.vehicleId);
    if (filters.code) params = params.set('code', filters.code);
    if (filters.level) params = params.set('level', filters.level);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<PaginatedResponse<DiagnosticEvent>>(`${this.baseUrl}/events`, { params });
  }

  getErrorsPerVehicle(from?: string, to?: string): Observable<ErrorsPerVehicle[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<ErrorsPerVehicle[]>(`${this.baseUrl}/aggregations/errors-per-vehicle`, { params });
  }

  getTopCodes(level?: string, from?: string, to?: string): Observable<TopCode[]> {
    let params = new HttpParams();
    if (level) params = params.set('level', level);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<TopCode[]>(`${this.baseUrl}/aggregations/top-codes`, { params });
  }

  getCriticalVehicles(): Observable<CriticalVehicle[]> {
    return this.http.get<CriticalVehicle[]>(`${this.baseUrl}/aggregations/critical-vehicles`);
  }
}
