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
      const role = authService.getRole();

      if (role === 'PARTNER') {
        router.navigate(['/partner-dashboard']);
      } else {
        router.navigate(['/dashboard']);
      }

      return false;
    }),
    catchError(() => of(true))
  );
};


export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const dataService = inject(DataService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as string[];

  const checkRole = (role: string) => {
    if (allowedRoles.includes(role)) {
      return true;
    }

    // Redirect based on actual user's role
    if (role === 'PARTNER') {
      return router.createUrlTree(['/partner-dashboard']);
    }

    return router.createUrlTree(['/dashboard']);
  };


  // 1. Check already cached role
  const role = authService.getRole();

  if (role) {
    return checkRole(role);
  }


  // 2. Check cached basic details
  const details = authService.getBasicDetails();

  if (details?.user_role) {
    authService.setRole(details.user_role);
    return checkRole(details.user_role);
  }


  // 3. Fetch from backend if not available
  return dataService.getBasicData().pipe(
    map((res: any) => {
      authService.setBasicDetails(res);
      authService.setRole(res.user_role);

      return checkRole(res.user_role);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/login']));
    })
  );
};