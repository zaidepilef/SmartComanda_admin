import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  role?: 'sysadmin' | 'owner' | 'admin' | 'cashier';
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  captchaToken: string;
}

const TOKEN_KEY = 'smartcomanda_admin_token';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid credentials.': 'Credenciales inválidas. Verifica tu email y contraseña.',
  'This account awaits verification.':
    'Tu cuenta está pendiente de verificación interna.',
  'This account is inactive.': 'Tu cuenta está bloqueada.',
  'Captcha verification failed.': 'La verificación de seguridad falló. Intenta nuevamente.'
};

const GENERIC_ERROR_MESSAGE = 'No se pudo completar la operación. Intenta nuevamente.';

export function authErrorMessage(raw: string | undefined): string {
  return (raw && AUTH_ERROR_MESSAGES[raw]) || GENERIC_ERROR_MESSAGE;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);

  readonly #user = signal<AuthUser | null>(null);
  readonly user = this.#user.asReadonly();

  #profileLoading = false;
  #profileLoadingPromise: Promise<AuthUser | null> | null = null;

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      this.#user.set(null);
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.#http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, {
      email,
      password
    });
  }

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.#http.post<AuthUser>(`${environment.apiUrl}/api/auth/register`, payload);
  }

  me(): Observable<AuthUser> {
    return this.#http.get<AuthUser>(`${environment.apiUrl}/api/auth/me`);
  }

  logout(): Observable<void> {
    return this.#http.post<void>(`${environment.apiUrl}/api/auth/logout`, {});
  }

  loadProfile(): void {
    if (!this.isAuthenticated() || this.#user() !== null || this.#profileLoading) {
      return;
    }

    void this.#fetchProfile();
  }

  loadProfileAndWait(): Promise<AuthUser | null> {
    if (this.#user() !== null) {
      return Promise.resolve(this.#user());
    }

    if (!this.isAuthenticated()) {
      return Promise.resolve(null);
    }

    if (this.#profileLoadingPromise === null) {
      this.#fetchProfile();
    }

    return this.#profileLoadingPromise ?? Promise.resolve(null);
  }

  #fetchProfile(): Promise<AuthUser | null> {
    this.#profileLoading = true;

    const promise = new Promise<AuthUser | null>((resolve) => {
      this.me().subscribe({
        next: (user) => {
          this.#user.set(user);
          resolve(user);
        },
        error: () => resolve(null),
        complete: () => {
          this.#profileLoading = false;
          this.#profileLoadingPromise = null;
        }
      });
    });

    this.#profileLoadingPromise = promise;
    return promise;
  }

  clearSessionAndRedirect(): void {
    this.setToken(null);
    void this.#router.navigate(['/login']);
  }
}
