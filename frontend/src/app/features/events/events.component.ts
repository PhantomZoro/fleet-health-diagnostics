import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { DiagnosticsStore } from '../../store/diagnostics.store';
import { FilterPanelComponent } from '../../shared/filter-panel/filter-panel.component';
import { SeverityBadgeComponent } from '../../shared/severity-badge/severity-badge.component';
import { SeverityLegendComponent } from '../../shared/severity-legend/severity-legend.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
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

  readonly events$ = this.store.events$;
  readonly loading$ = this.store.loading$;
  readonly total$ = this.store.total$;
  readonly page$ = this.store.page$;
  readonly filters$ = this.store.filters$;
  readonly error$ = this.store.error$;
  readonly sortBy$ = this.store.sortBy$;
  readonly sortOrder$ = this.store.sortOrder$;

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
  }

  onFiltersReset(): void {
    this.store.resetFilters();
  }

  onPageChange(page: number): void {
    this.store.setPage(page);
  }

  onSort(field: EventSortField, currentSortBy: EventSortField, currentSortOrder: SortOrder): void {
    const sortOrder: SortOrder = field === currentSortBy && currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    this.store.setSort({ sortBy: field, sortOrder });
  }
}
