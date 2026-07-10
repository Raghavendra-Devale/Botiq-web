import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DataService } from '../data.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(() => {
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      return of(true);
    })
  );
};

export const ownerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const dataService = inject(DataService);
  const router = inject(Router);

  const role = authService.getRole();
  if (role === 'OWNER') {
    return true;
  }

  const details = authService.getBasicDetails();
  if (details) {
    if (details.user_role === 'OWNER') {
      authService.setRole(details.user_role);
      return true;
    }
    router.navigate(['/dashboard']);
    return false;
  }

  return dataService.getBasicData().pipe(
    map((res: any) => {
      authService.setBasicDetails(res);
      if (res.user_role === 'OWNER') {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};