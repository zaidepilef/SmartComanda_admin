import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.user() === null) {
      await authService.loadProfileAndWait();
    }

    const role = authService.user()?.role;

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
