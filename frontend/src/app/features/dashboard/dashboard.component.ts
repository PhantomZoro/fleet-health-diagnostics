import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { DiagnosticsStore } from '../../store/diagnostics.store';
import { FilterPanelComponent } from '../../shared/filter-panel/filter-panel.component';
import { SeverityBadgeComponent } from '../../shared/severity-badge/severity-badge.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import { EventFilters } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DiagnosticsStore],
  imports: [
    AsyncPipe,
    DatePipe,
    FilterPanelComponent,
    SeverityBadgeComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly store = inject(DiagnosticsStore);
  private readonly router = inject(Router);

  readonly aggregations$ = this.store.aggregations$;
  readonly loading$ = this.store.loading$;
  readonly filters$ = this.store.filters$;
  readonly error$ = this.store.error$;
  readonly total$ = this.store.total$;

  readonly totalVehicles$ = this.aggregations$.pipe(
    map(agg => agg.errorsPerVehicle.length)
  );

  readonly criticalCount$ = this.aggregations$.pipe(
    map(agg => agg.criticalVehicles.length)
  );

  readonly mostCommonCode$ = this.aggregations$.pipe(
    map(agg => agg.topCodes[0]?.code ?? 'N/A')
  );

  onFiltersApply(filters: EventFilters): void {
    this.store.setFilters(filters);
  }

  onFiltersReset(): void {
    this.store.resetFilters();
  }

  onCriticalVehicleClick(vehicleId: string): void {
    this.router.navigate(['/events'], { queryParams: { vehicleId } });
  }

  getBarWidth(count: number, maxTotal: number): string {
    if (maxTotal === 0) return '0%';
    return `${(count / maxTotal) * 100}%`;
  }
}
