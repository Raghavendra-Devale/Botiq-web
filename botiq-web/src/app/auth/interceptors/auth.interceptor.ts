import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signOut } from 'firebase/auth';
import { from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = getAuth();
  const router = inject(Router);

  // Wait for Firebase to read from persistence (IndexedDB/localStorage)
  // before inspecting auth.currentUser
  return from(auth.authStateReady()).pipe(
    switchMap(() => {
      const user = auth.currentUser;

      if (!user) {
        return next(req);
      }

      // user.getIdToken() has built-in caching and refresh logic
      return from(user.getIdToken()).pipe(
        switchMap((token) => {
          const clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });

          // Catch 401 Unauthorized errors from your Spring Boot Backend
          return next(clonedReq).pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                signOut(auth).then(() => {
                  localStorage.removeItem('token');
                  router.navigate(['/login']);
                });
              }
              return throwError(() => error);
            })
          );
        }),
        // Catch Firebase internal errors (e.g., if the long-lived refresh token actually expired or user account was disabled)
        catchError((error) => {
          signOut(auth).then(() => {
            localStorage.removeItem('token');
            router.navigate(['/login']);
          });
          return throwError(() => error);
        })
      );
    })
  );
};

