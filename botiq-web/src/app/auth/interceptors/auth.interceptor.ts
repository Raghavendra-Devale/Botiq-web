import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signOut } from 'firebase/auth';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = getAuth();
  const router = inject(Router);

  // Check if the request is targeted to our backend
  const isBackendRequest = req.url.startsWith(environment.apiUrl) ||
                           req.url.startsWith('http://localhost:8080') ||
                           !req.url.startsWith('http');

  if (!isBackendRequest) {
    return next(req);
  }

  // All backend requests (including session establishment) need withCredentials: true
  // so that cookies (JSESSIONID) are successfully stored (at login) and sent (subsequently).
  const clonedReq = req.clone({
    withCredentials: true
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Catch 401 Unauthorized or 403 Forbidden errors from Spring Boot Backend
      if (error.status === 401 || error.status === 403) {
        signOut(auth).then(() => {
          // localStorage.removeItem('token'); // Uncomment if you use local storage key clearing
          router.navigate(['/login']);
        });
      }
      return throwError(() => error);
    })
  );
};
