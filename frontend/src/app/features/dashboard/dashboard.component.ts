import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DiagnosticsStore } from '../../store/diagnostics.store';
import { FilterPanelComponent } from '../../shared/filter-panel/filter-panel.component';
import { ActiveFiltersBarComponent } from '../../shared/active-filters-bar/active-filters-bar.component';
import { SeverityBadgeComponent } from '../../shared/severity-badge/severity-badge.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import { SeverityLegendComponent } from '../../shared/severity-legend/severity-legend.component';
import { NotificationService } from '../../core/services/notification.service';
import { EventFilters } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DiagnosticsStore],
  imports: [
    AsyncPipe,
    DatePipe,
    RouterLink,
    FilterPanelComponent,
    ActiveFiltersBarComponent,
    SeverityBadgeComponent,
    SeverityLegendComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly store = inject(DiagnosticsStore);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

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

  readonly hasCodeFilter$ = this.filters$.pipe(
    map(f => !!f.code)
  );

  onFiltersApply(filters: EventFilters): void {
    this.store.setFilters(filters);
    const desc = this.describeFilters(filters);
    if (desc) {
      this.notifications.show(`Filters applied: ${desc}`, 'info');
    }
  }

  onFiltersReset(): void {
    this.store.resetFilters();
    this.notifications.show('All filters cleared', 'info');
  }

  onCriticalVehicleClick(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  getBarWidth(count: number, maxTotal: number): string {
    if (maxTotal === 0) return '0%';
    return `${(count / maxTotal) * 100}%`;
  }

  private describeFilters(filters: EventFilters): string {
    const parts: string[] = [];
    if (filters.vehicleId) parts.push(`Vehicle: ${filters.vehicleId}`);
    if (filters.code) parts.push(`Code: ${filters.code}`);
    if (filters.level) parts.push(`Severity: ${filters.level}`);
    if (filters.from) parts.push(`From: ${new Date(filters.from).toLocaleDateString()}`);
    if (filters.to) parts.push(`To: ${new Date(filters.to).toLocaleDateString()}`);
    return parts.join(', ');
  }
}
