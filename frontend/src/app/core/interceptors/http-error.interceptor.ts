import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message: string;

      if (error.status === 0) {
        message = 'Unable to connect to server. Please check your connection.';
      } else if (error.status >= 500) {
        message = `Server error (${error.status}). Please try again later.`;
      } else if (error.status === 400) {
        const errBody = error.error as { message?: string } | null;
        message = `Bad request: ${errBody?.message ?? 'Invalid parameters'}`;
      } else if (error.status === 404) {
        message = 'Resource not found.';
      } else {
        message = `Request failed (${error.status})`;
      }

      notifications.show(message, 'error');
      return throwError(() => error);
    })
  );
};
