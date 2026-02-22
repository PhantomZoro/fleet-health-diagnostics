import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take, map } from 'rxjs';
import { DiagnosticsStore } from '../../store/diagnostics.store';
import { FilterPanelComponent } from '../../shared/filter-panel/filter-panel.component';
import { ActiveFiltersBarComponent } from '../../shared/active-filters-bar/active-filters-bar.component';
import { SeverityBadgeComponent } from '../../shared/severity-badge/severity-badge.component';
import { SeverityLegendComponent } from '../../shared/severity-legend/severity-legend.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import { NotificationService } from '../../core/services/notification.service';
import { EventFilters, EventSortField, SortOrder } from '../../core/models';

@Component({
  selector: 'app-events',
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
    PaginationComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
})
export class EventsComponent {
  private readonly store = inject(DiagnosticsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly events$ = this.store.events$;
  readonly loading$ = this.store.loading$;
  readonly total$ = this.store.total$;
  readonly page$ = this.store.page$;
  readonly filters$ = this.store.filters$;
  readonly error$ = this.store.error$;
  readonly sortBy$ = this.store.sortBy$;
  readonly sortOrder$ = this.store.sortOrder$;

  readonly hasActiveFilters$ = this.store.filters$.pipe(
    map(f => !!(f.vehicleId || f.code || f.level || f.from || f.to))
  );

  readonly limit = 20;

  constructor() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const vehicleId = params['vehicleId'];
      if (vehicleId) {
        this.store.setFilters({ vehicleId });
      }
    });
  }

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

  onPageChange(page: number): void {
    this.store.setPage(page);
  }

  onSort(field: EventSortField, currentSortBy: EventSortField, currentSortOrder: SortOrder): void {
    const sortOrder: SortOrder = field === currentSortBy && currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    this.store.setSort({ sortBy: field, sortOrder });
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
