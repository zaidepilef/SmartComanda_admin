import { Component, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, authErrorMessage } from '../../auth.service';
import { TurnstileComponent } from '../../components/turnstile/turnstile.component';

function mustMatch(passwordKey: string, confirmKey: string) {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordKey)?.value;
    const confirm = control.get(confirmKey)?.value;

    if (password && confirm && password !== confirm) {
      return { mismatch: true };
    }

    return null;
  };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TurnstileComponent, NgClass],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  readonly #fb = inject(FormBuilder);
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  private readonly turnstile = viewChild.required(TurnstileComponent);

  readonly form = this.#fb.nonNullable.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: mustMatch('password', 'confirmPassword') }
  );

  readonly error = signal('');
  readonly loading = signal(false);
  readonly registered = signal(false);

  constructor() {
    if (this.#authService.isAuthenticated()) {
      void this.#router.navigate(['/dashboard']);
    }

    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.confirmPassword.updateValueAndValidity();
    });
  }

  get captchaToken(): string | null {
    return this.turnstile().token();
  }

  get canSubmit(): boolean {
    return this.form.valid && this.captchaToken !== null && !this.loading();
  }

  submit(): void {
    if (this.form.invalid || this.captchaToken === null) {
      return;
    }

    this.error.set('');
    this.loading.set(true);

    const { firstName, lastName, email, password } = this.form.getRawValue();

    this.#authService
      .register({ firstName, lastName, email, password, captchaToken: this.captchaToken })
      .subscribe({
        next: () => {
          this.registered.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(authErrorMessage(err.error?.error));
          this.turnstile().reset();
        }
      });
  }
}