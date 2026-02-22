import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-severity-legend',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="severity-legend" role="complementary" aria-label="Severity level legend">
      <span class="legend-title">Severity</span>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-indicator legend-indicator--error"></span>
          <span class="legend-label">Error</span>
          <span class="legend-desc">Critical failure requiring attention</span>
        </div>
        <div class="legend-item">
          <span class="legend-indicator legend-indicator--warn"></span>
          <span class="legend-label">Warn</span>
          <span class="legend-desc">Potential issue detected</span>
        </div>
        <div class="legend-item">
          <span class="legend-indicator legend-indicator--info"></span>
          <span class="legend-label">Info</span>
          <span class="legend-desc">Routine diagnostic event</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .severity-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: var(--surface-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow-card);
      margin-top: 16px;
    }

    .legend-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .legend-items {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-indicator {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .legend-indicator--error {
      background: var(--error);
    }

    .legend-indicator--warn {
      background: var(--warn);
    }

    .legend-indicator--info {
      background: var(--info);
    }

    .legend-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-dark);
    }

    .legend-desc {
      font-size: 12px;
      color: var(--text-secondary);
    }
  `]
})
export class SeverityLegendComponent {}
