import { Component, inject, output, signal, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../../auth/auth.service';
import { IconComponent, AppIconName } from '../../../icons/icon.component';
import { ThemeMode, ThemeService } from '../../../services/theme.service';

const DEFAULT_TITLE = 'SmartComanda';

function findRouteTitle(route: ActivatedRouteSnapshot): string {
  let title: unknown;
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    title = current.data?.['title'] ?? title;
    current = current.firstChild;
  }

  return typeof title === 'string' && title !== '' ? title : DEFAULT_TITLE;
}

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  imports: [IconComponent]
})
export class DefaultHeaderComponent {
  readonly #authService = inject(AuthService);
  readonly #themeService = inject(ThemeService);
  readonly #router = inject(Router);

  readonly sidebarOpen = input(false);
  readonly toggleSidebar = output();

  readonly user = this.#authService.user;
  readonly themeMode = this.#themeService.mode;

  /** Título de la página actual: el `data.title` de la ruta más profunda. */
  readonly pageTitle = toSignal(
    this.#router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => findRouteTitle(this.#router.routerState.snapshot.root))
    ),
    { initialValue: DEFAULT_TITLE }
  );

  readonly userMenuOpen = signal(false);
  readonly themeMenuOpen = signal(false);

  readonly themeModes: { mode: ThemeMode; label: string; icon: AppIconName }[] = [
    { mode: 'light', label: 'Light', icon: 'sun' },
    { mode: 'dark', label: 'Dark', icon: 'moon' },
    { mode: 'auto', label: 'Auto', icon: 'contrast' }
  ];

  constructor() {
    this.#authService.loadProfile();
  }

  setTheme(mode: ThemeMode): void {
    this.#themeService.setMode(mode);
    this.themeMenuOpen.set(false);
  }

  closeMenus(): void {
    this.userMenuOpen.set(false);
    this.themeMenuOpen.set(false);
  }

  onLogout(): void {
    this.#authService.logout().subscribe({
      next: () => this.#authService.clearSessionAndRedirect(),
      error: () => this.#authService.clearSessionAndRedirect()
    });
  }
}
