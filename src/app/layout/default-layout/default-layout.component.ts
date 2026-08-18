import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../icons/icon.component';
import { DefaultFooterComponent } from './default-footer/default-footer.component';
import { DefaultHeaderComponent } from './default-header/default-header.component';
import { navItems } from './_nav';

@Component({
  selector: 'app-default-layout',
  templateUrl: './default-layout.component.html',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    DefaultFooterComponent,
    DefaultHeaderComponent
  ]
})
export class DefaultLayoutComponent {
  readonly #authService = inject(AuthService);

  public readonly navItems = computed(() => {
    const role = this.#authService.user()?.role;

    return navItems.filter((item) => !item.roles || (role && item.roles.includes(role)));
  });

  readonly sidebarOpen = signal(false);

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
