import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toast.component.scss',
  template: `
    <div class="toast-container" aria-live="polite">
      @for (notification of (notifications$ | async) ?? []; track notification.id) {
        <div class="toast" [class]="'toast--' + notification.type" role="alert">
          <span class="toast-message">{{ notification.message }}</span>
          <button class="toast-dismiss" (click)="dismiss(notification.id)" aria-label="Dismiss notification">&times;</button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  private readonly notifications = inject(NotificationService);

  readonly notifications$ = this.notifications.notifications$;

  dismiss(id: number): void {
    this.notifications.dismiss(id);
  }
}
