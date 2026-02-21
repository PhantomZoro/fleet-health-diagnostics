import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { DiagnosticsStore } from '../../store/diagnostics.store';
import { FilterPanelComponent } from '../../shared/filter-panel/filter-panel.component';
import { SeverityBadgeComponent } from '../../shared/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import { EventFilters } from '../../core/models';

@Component({
  selector: 'app-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DiagnosticsStore],
  imports: [
    AsyncPipe,
    DatePipe,
    FilterPanelComponent,
    SeverityBadgeComponent,
    PaginationComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
})
export class EventsComponent {
  private readonly store = inject(DiagnosticsStore);

  readonly events$ = this.store.events$;
  readonly loading$ = this.store.loading$;
  readonly total$ = this.store.total$;
  readonly page$ = this.store.page$;
  readonly filters$ = this.store.filters$;
  readonly error$ = this.store.error$;

  readonly limit = 20;

  onFiltersApply(filters: EventFilters): void {
    this.store.setFilters(filters);
  }

  onFiltersReset(): void {
    this.store.resetFilters();
  }

  onPageChange(page: number): void {
    this.store.setPage(page);
  }
}
