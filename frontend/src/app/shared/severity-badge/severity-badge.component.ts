import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DiagnosticLevel } from '../../core/models';

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [],
  template: `<span
    class="badge"
    [class]="'badge badge--' + level.toLowerCase()"
    [attr.aria-label]="level + ' severity'"
  >{{ level }}</span>`,
  styleUrl: './severity-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeverityBadgeComponent {
  @Input({ required: true }) level!: DiagnosticLevel;
}
