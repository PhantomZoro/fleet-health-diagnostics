import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { EventFilters } from '../../core/models';

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-active-filters-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chips.length > 0) {
      <div class="active-filters-bar" role="status" aria-label="Active filters">
        <span class="bar-label">Filtered by:</span>
        <div class="chips">
          @for (chip of chips; track chip.key) {
            <span class="chip">
              <span class="chip-key">{{ chip.label }}</span>
              <span class="chip-value">{{ chip.value }}</span>
            </span>
          }
        </div>
        <button class="clear-btn" (click)="clearAll.emit()" aria-label="Clear all filters">
          Clear all
        </button>
      </div>
    }
  `,
  styles: [`
    .active-filters-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: var(--bmw-blue-light);
      border: 1px solid rgba(0, 102, 177, 0.15);
      border-radius: var(--radius);
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .bar-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bmw-blue);
      flex-shrink: 0;
    }

    .chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      background: var(--surface-card);
      border: 1px solid rgba(0, 102, 177, 0.2);
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.4;
    }

    .chip-key {
      color: var(--text-secondary);
      font-weight: 600;
    }

    .chip-value {
      color: var(--bmw-blue);
      font-weight: 700;
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--bmw-blue);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius);
      font-family: inherit;
      flex-shrink: 0;
      transition: background 0.15s;

      &:hover {
        background: rgba(0, 102, 177, 0.1);
      }
    }
  `]
})
export class ActiveFiltersBarComponent {
  @Input() set filters(value: EventFilters) {
    this.chips = this.buildChips(value ?? {});
  }

  @Output() clearAll = new EventEmitter<void>();

  chips: FilterChip[] = [];

  private buildChips(filters: EventFilters): FilterChip[] {
    const chips: FilterChip[] = [];
    if (filters.vehicleId) {
      chips.push({ key: 'vehicleId', label: 'Vehicle', value: filters.vehicleId });
    }
    if (filters.code) {
      chips.push({ key: 'code', label: 'Code', value: filters.code });
    }
    if (filters.level) {
      chips.push({ key: 'level', label: 'Severity', value: filters.level });
    }
    if (filters.from) {
      chips.push({ key: 'from', label: 'From', value: new Date(filters.from).toLocaleDateString() });
    }
    if (filters.to) {
      chips.push({ key: 'to', label: 'To', value: new Date(filters.to).toLocaleDateString() });
    }
    return chips;
  }
}
