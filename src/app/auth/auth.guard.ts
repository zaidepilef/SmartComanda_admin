import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, canUseAdminPanel } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const user = await authService.loadProfileAndWait();

  // Una sesión de Cajero, Cocinero o Repartidor (p. ej. un token guardado) no entra al panel.
  if (user && !canUseAdminPanel(user)) {
    authService.setToken(null);
    return router.createUrlTree(['/login']);
  }

  return true;
};
