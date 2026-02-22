import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DiagnosticLevel, EventFilters } from '../../core/models';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrl: './filter-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPanelComponent implements OnChanges {
  @Input() filters: EventFilters = {};
  @Output() filtersApply = new EventEmitter<EventFilters>();
  @Output() filtersReset = new EventEmitter<void>();

  vehicleId = '';
  code = '';
  level: DiagnosticLevel | '' = '';
  dateFrom = '';
  dateTo = '';
  hasActiveFilters = false;

  readonly levelOptions: DiagnosticLevel[] = ['ERROR', 'WARN', 'INFO'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && this.filters) {
      this.vehicleId = this.filters.vehicleId ?? '';
      this.code = this.filters.code ?? '';
      this.level = this.filters.level ?? '';
      this.dateFrom = this.filters.from ?? '';
      this.dateTo = this.filters.to ?? '';
      this.hasActiveFilters = !!(this.filters.vehicleId || this.filters.code || this.filters.level || this.filters.from || this.filters.to);
    }
  }

  onApply(): void {
    const assembled: EventFilters = {};
    if (this.vehicleId.trim()) assembled.vehicleId = this.vehicleId.trim();
    if (this.code.trim()) assembled.code = this.code.trim();
    if (this.level) assembled.level = this.level;
    if (this.dateFrom) assembled.from = this.dateFrom;
    if (this.dateTo) assembled.to = this.dateTo;
    this.filtersApply.emit(assembled);
  }

  onReset(): void {
    this.vehicleId = '';
    this.code = '';
    this.level = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.filtersReset.emit();
  }
}
