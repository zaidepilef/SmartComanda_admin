import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'smartcomanda-admin-theme-default';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('auto');

  #mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    this.mode.set(this.#isMode(stored) ? stored : 'auto');
    this.#apply();

    this.#mediaQuery.addEventListener('change', () => {
      if (this.mode() === 'auto') {
        this.#apply();
      }
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    this.#apply();
  }

  #apply(): void {
    const isDark =
      this.mode() === 'dark' ||
      (this.mode() === 'auto' && this.#mediaQuery.matches);

    document.documentElement.classList.toggle('dark', isDark);
  }

  #isMode(value: string | null): value is ThemeMode {
    return value === 'light' || value === 'dark' || value === 'auto';
  }
}
