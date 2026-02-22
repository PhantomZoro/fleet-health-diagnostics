import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DiagnosticLevel } from '../../core/models';

const DISPLAY_LABELS: Record<DiagnosticLevel, string> = {
  ERROR: 'CRITICAL',
  WARN: 'WARN',
  INFO: 'INFO',
};

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [],
  template: `<span
    class="badge"
    [class]="'badge badge--' + level.toLowerCase()"
    [attr.aria-label]="displayLabel + ' severity'"
  >{{ displayLabel }}</span>`,
  styleUrl: './severity-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeverityBadgeComponent {
  @Input({ required: true }) level!: DiagnosticLevel;

  get displayLabel(): string {
    return DISPLAY_LABELS[this.level] ?? this.level;
  }
}
