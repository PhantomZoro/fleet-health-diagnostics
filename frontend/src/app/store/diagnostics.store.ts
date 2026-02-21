import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComponentStore } from '@ngrx/component-store';
import {
  switchMap,
  debounceTime,
  distinctUntilChanged,
  shareReplay,
  tap,
  combineLatest,
  catchError,
  EMPTY
} from 'rxjs';
import { DiagnosticsApiService } from '../core/services/diagnostics-api.service';
import { EventFilters, DiagnosticEvent, PaginatedResponse } from '../core/models';
import { DiagnosticsState, AggregationState, initialState } from './diagnostics-state.model';

@Injectable()
export class DiagnosticsStore extends ComponentStore<DiagnosticsState> {
  private readonly api = inject(DiagnosticsApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    super(initialState);
    // Wire up reactive effects after construction
    this.loadEventsEffect();
    this.loadAggregationsEffect();
  }

  // ─── UPDATERS ───────────────────────────────────────────

  readonly setFilters = this.updater<EventFilters>((state, filters) => ({
    ...state,
    filters,
    page: 1  // Reset page when filters change
  }));

  readonly setPage = this.updater<number>((state, page) => ({
    ...state,
    page
  }));

  readonly resetFilters = this.updater<void>((state) => ({
    ...state,
    filters: {},
    page: 1
  }));

  // ─── SELECTORS ─────────────────────────────────────────
  // STATE-05: All selectors use distinctUntilChanged + shareReplay(1)

  readonly filters$ = this.select(state => state.filters).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly events$ = this.select(state => state.events).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly total$ = this.select(state => state.total).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly page$ = this.select(state => state.page).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly loading$ = this.select(state => state.loading).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly error$ = this.select(state => state.error).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly aggregations$ = this.select(state => state.aggregations).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  // ─── EFFECTS ────────────────────────────────────────────

  /**
   * loadEventsEffect:
   * STATE-04: combineLatest merges filters + page + limit into single trigger
   * STATE-02: debounceTime(300) prevents firing per keystroke
   * STATE-03: switchMap cancels in-flight request on new filter/page change
   * catchError inside switchMap inner pipe — does NOT kill the outer stream
   */
  private loadEventsEffect(): void {
    combineLatest([
      this.select(state => state.filters),
      this.select(state => state.page),
      this.select(state => state.limit)
    ]).pipe(
      debounceTime(300),
      tap(() => this.patchState({ loading: true, error: null })),
      switchMap(([filters, page, limit]) =>
        this.api.getEvents(filters, page, limit).pipe(
          tap((response: PaginatedResponse<DiagnosticEvent>) => {
            this.patchState({
              events: response.data,
              total: response.total,
              loading: false
            });
          }),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Failed to load events';
            this.patchState({ loading: false, error: message });
            // Return EMPTY so the outer stream is NOT completed — it stays alive for future emissions
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  /**
   * loadAggregationsEffect:
   * Triggered by filter changes (time range affects aggregations).
   * Uses same debounce + switchMap pattern for consistency.
   * catchError inside switchMap inner pipe — does NOT kill the outer stream
   */
  private loadAggregationsEffect(): void {
    this.select(state => state.filters).pipe(
      debounceTime(300),
      switchMap((filters) => {
        const { from, to } = filters;
        // Fire all three aggregation requests, combine results
        return combineLatest([
          this.api.getErrorsPerVehicle(from, to),
          this.api.getTopCodes(undefined, from, to),
          this.api.getCriticalVehicles()
        ]).pipe(
          tap(([errorsPerVehicle, topCodes, criticalVehicles]) => {
            this.patchState({
              aggregations: { errorsPerVehicle, topCodes, criticalVehicles } satisfies AggregationState
            });
          }),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Failed to load aggregations';
            this.patchState({ error: message });
            // Return EMPTY so the outer stream is NOT completed — it stays alive for future emissions
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }
}
