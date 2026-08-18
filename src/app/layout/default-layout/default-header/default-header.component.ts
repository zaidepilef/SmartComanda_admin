import { Component, inject, output, signal, input } from '@angular/core';

import { AuthService } from '../../../auth/auth.service';
import { IconComponent, AppIconName } from '../../../icons/icon.component';
import { ThemeMode, ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  imports: [IconComponent]
})
export class DefaultHeaderComponent {
  readonly #authService = inject(AuthService);
  readonly #themeService = inject(ThemeService);

  readonly sidebarOpen = input(false);
  readonly toggleSidebar = output();

  readonly user = this.#authService.user;
  readonly themeMode = this.#themeService.mode;

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
