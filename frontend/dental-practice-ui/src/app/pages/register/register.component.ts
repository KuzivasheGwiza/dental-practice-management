import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-section"><div class="auth-card wide">
      <span class="eyebrow">Patient portal</span><h1>Create your account</h1><p>Register once, then manage future appointments online.</p>
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid two">
        <label>First name<input formControlName="firstName" autocomplete="given-name"></label>
        <label>Last name<input formControlName="lastName" autocomplete="family-name"></label>
        <label>Email<input type="email" formControlName="email" autocomplete="email"></label>
        <label>Phone number<input formControlName="phoneNumber" autocomplete="tel"></label>
        <label>Date of birth <span class="optional">optional</span><input type="date" formControlName="dateOfBirth"></label>
        <label>Password<input type="password" formControlName="password" autocomplete="new-password"></label>
        <p class="form-span">We use your details to manage your appointments. <a routerLink="/information">Read the privacy notice and booking policies</a>.</p><div class="form-span"><small>Password must contain upper/lowercase letters, a number and a symbol, and be at least 8 characters.</small></div>
        <button class="btn btn-primary form-span" type="submit" [disabled]="form.invalid || loading">{{ loading ? 'Creating account…' : 'Create account' }}</button>
      </form>
      <p class="auth-foot">Already registered? <a routerLink="/login">Log in</a></p>
    </div></section>
  `
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  loading = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    dateOfBirth: [''],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true; this.error = '';
    const v = this.form.getRawValue();
    this.auth.register({ ...v, dateOfBirth: v.dateOfBirth || null }).subscribe({
      next: () => { this.loading = false; void this.router.navigateByUrl('/patient'); },
      error: err => { this.loading = false; this.error = errorMessage(err, 'Registration failed.'); }
    });
  }
}
