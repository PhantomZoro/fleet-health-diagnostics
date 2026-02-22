import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComponentStore } from '@ngrx/component-store';
import {
  switchMap,
  tap,
  catchError,
  EMPTY,
  combineLatest,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs';
import { DiagnosticsApiService } from '../../core/services/diagnostics-api.service';
import type {
  VehicleSummary,
  VehicleCard,
  VehicleHealthStatus,
  ErrorsPerVehicle,
  CriticalVehicle,
} from '../../core/models';

interface VehicleState {
  // Fleet grid
  fleetCards: VehicleCard[];
  fleetLoading: boolean;
  fleetError: string | null;
  // Vehicle detail
  vehicleDetail: VehicleSummary | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialState: VehicleState = {
  fleetCards: [],
  fleetLoading: false,
  fleetError: null,
  vehicleDetail: null,
  detailLoading: false,
  detailError: null,
};

@Injectable()
export class VehicleStore extends ComponentStore<VehicleState> {
  private readonly api = inject(DiagnosticsApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    super(initialState);
  }

  // ─── SELECTORS ─────────────────────────────────────────

  readonly fleetCards$ = this.select(state => state.fleetCards).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly fleetLoading$ = this.select(state => state.fleetLoading).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly fleetError$ = this.select(state => state.fleetError).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly vehicleDetail$ = this.select(state => state.vehicleDetail).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly detailLoading$ = this.select(state => state.detailLoading).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly detailError$ = this.select(state => state.detailError).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly detailHealthStatus$ = this.select(state => {
    const detail = state.vehicleDetail;
    if (!detail) return null;
    return computeDetailHealth(detail.errorCount);
  }).pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  // ─── EFFECTS ────────────────────────────────────────────

  readonly loadFleetGrid = this.effect<void>(trigger$ =>
    trigger$.pipe(
      tap(() => this.patchState({ fleetLoading: true, fleetError: null })),
      switchMap(() =>
        combineLatest([
          this.api.getErrorsPerVehicle(),
          this.api.getCriticalVehicles(),
        ]).pipe(
          tap(([errorsPerVehicle, criticalVehicles]) => {
            const criticalIds = new Set(criticalVehicles.map(cv => cv.vehicleId));
            const cards = buildFleetCards(errorsPerVehicle, criticalIds);
            this.patchState({ fleetCards: cards, fleetLoading: false });
          }),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Failed to load fleet data';
            this.patchState({ fleetLoading: false, fleetError: message });
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    )
  );

  readonly loadVehicleDetail = this.effect<string>(vehicleId$ =>
    vehicleId$.pipe(
      tap(() => this.patchState({ detailLoading: true, detailError: null, vehicleDetail: null })),
      switchMap(vehicleId =>
        this.api.getVehicleSummary(vehicleId).pipe(
          tap(summary => {
            this.patchState({ vehicleDetail: summary, detailLoading: false });
          }),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Failed to load vehicle details';
            this.patchState({ detailLoading: false, detailError: message });
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    )
  );
}

function computeDetailHealth(errorCount: number): VehicleHealthStatus {
  if (errorCount >= 3) return 'CRITICAL';
  if (errorCount > 0) return 'WARNING';
  return 'HEALTHY';
}

function buildFleetCards(
  errorsPerVehicle: ErrorsPerVehicle[],
  criticalIds: Set<string>
): VehicleCard[] {
  return errorsPerVehicle.map(v => ({
    vehicleId: v.vehicleId,
    errorCount: v.errorCount,
    warnCount: v.warnCount,
    infoCount: v.infoCount,
    total: v.total,
    healthStatus: criticalIds.has(v.vehicleId)
      ? 'CRITICAL' as VehicleHealthStatus
      : v.errorCount > 0
        ? 'WARNING' as VehicleHealthStatus
        : 'HEALTHY' as VehicleHealthStatus,
  }));
}
