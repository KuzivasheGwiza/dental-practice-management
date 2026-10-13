import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { errorMessage } from '../../core/http-error';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-section"><div class="auth-card">
      <span class="eyebrow">Welcome back</span><h1>Log in</h1><p>Access your patient, staff or administration portal.</p>
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">
        <label>Email<input type="email" formControlName="email" autocomplete="email"></label>
        <label>Password<input type="password" formControlName="password" autocomplete="current-password"></label>
        <label>Authenticator code <span class="optional">if enabled</span><input formControlName="authenticatorCode" autocomplete="one-time-code" inputmode="numeric"></label><label>Recovery code <span class="optional">if your authenticator is unavailable</span><input formControlName="recoveryCode" autocomplete="off"></label>
        <button class="btn btn-primary full" type="submit" [disabled]="form.invalid || loading">{{ loading ? 'Signing in…' : 'Log in' }}</button>
      </form>
      <p><a routerLink="/account/forgot">Forgot password?</a></p><p class="auth-foot">New patient? <a routerLink="/register">Create an account</a></p>
      <div class="demo-note" *ngIf="isDevelopment"><strong>Development accounts</strong><small>Admin: admin@dental.local &nbsp; | &nbsp; Dentist: dentist@dental.local &nbsp; | &nbsp; Reception: reception@dental.local</small><small>Password: ChangeMe123! — change these before deployment.</small></div>
    </div></section>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isDevelopment = !environment.production;
  loading = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required], authenticatorCode: [''], recoveryCode: ['']
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true; this.error = '';
    this.auth.login(this.form.controls.email.value, this.form.controls.password.value, this.form.controls.authenticatorCode.value, this.form.controls.recoveryCode.value).subscribe({
      next: session => {
        this.loading = false;
        const route = session.mfaEnrollmentRequired ? '/security' : session.roles.includes('Administrator') ? '/admin' : session.roles.some(x => x === 'Receptionist' || x === 'Dentist') ? '/staff' : '/patient';
        void this.router.navigateByUrl(route);
      },
      error: err => { this.loading = false; this.error = errorMessage(err, 'Login failed.'); }
    });
  }
}
