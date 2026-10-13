import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storageKey = 'dental_auth';

  login(email: string, password: string, authenticatorCode = '', recoveryCode = '') {
    return this.api.post<AuthResponse>('/auth/login', { email, password, authenticatorCode, recoveryCode }).pipe(tap(x => this.setSession(x)));
  }

  register(payload: { firstName: string; lastName: string; email: string; phoneNumber: string; dateOfBirth?: string | null; password: string }) {
    return this.api.post<AuthResponse>('/auth/register', payload).pipe(tap(x => this.setSession(x)));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    void this.router.navigateByUrl('/');
  }

  get session(): AuthResponse | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as AuthResponse;
      if (new Date(value.expiresAtUtc) <= new Date()) {
        localStorage.removeItem(this.storageKey);
        return null;
      }
      return value;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  get token(): string | null { return this.session?.token ?? null; }
  get isLoggedIn(): boolean { return !!this.session; }
  get displayName(): string { return this.session?.displayName ?? ''; }
  get roles(): string[] { return this.session?.roles ?? []; }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  updateLocalProfile(email: string, displayName: string): void {
    const current = this.session;
    if (!current) return;
    this.setSession({ ...current, email, displayName });
  }

  updateSession(value: AuthResponse): void { this.setSession(value); }

  private setSession(value: AuthResponse): void {
    localStorage.setItem(this.storageKey, JSON.stringify(value));
  }
}
