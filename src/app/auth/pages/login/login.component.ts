import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, authErrorMessage } from '../../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  readonly #fb = inject(FormBuilder);
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  readonly form = this.#fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  readonly error = signal('');
  readonly loading = signal(false);

  constructor() {
    if (this.#authService.isAuthenticated()) {
      void this.#router.navigate(['/dashboard']);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.#authService.login(email, password).subscribe({
      next: (result) => {
        this.#authService.setToken(result.token);
        void this.#router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(authErrorMessage(err.error?.error));
      }
    });
  }
}
