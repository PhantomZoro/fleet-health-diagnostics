import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);

  readonly notifications$ = this.notificationsSubject.asObservable();

  show(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    const id = Date.now();
    const notification: Notification = { id, message, type, timestamp: id };
    this.notificationsSubject.next([...this.notificationsSubject.value, notification]);
    setTimeout(() => this.dismiss(id), 5000);
  }

  dismiss(id: number): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.filter(n => n.id !== id)
    );
  }
}
