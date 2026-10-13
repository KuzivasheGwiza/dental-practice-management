import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { environment } from '../environments/environment';
import { filter, Subscription } from 'rxjs';
import { ProfileImageService } from './core/profile-image.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="shell nav-wrap">
        <a routerLink="/" class="brand" aria-label="Home">
          <span class="brand-mark">D</span>
          <span>{{ practiceName }}</span>
        </a>
        <nav class="nav-links" aria-label="Primary navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
          <a routerLink="/services" routerLinkActive="active">Services</a>
          <a routerLink="/information" routerLinkActive="active">Plan your visit</a>
          <a *ngIf="auth.hasRole('Patient')" routerLink="/book" routerLinkActive="active">Book</a>
          <a *ngIf="auth.hasRole('Patient')" routerLink="/patient" routerLinkActive="active">My appointments</a>
          <a *ngIf="auth.hasRole('Receptionist') || auth.hasRole('Dentist') || auth.hasRole('Administrator')" routerLink="/staff" routerLinkActive="active">Staff</a>
          <a *ngIf="auth.hasRole('Administrator')" routerLink="/admin" routerLinkActive="active">Admin</a>
        </nav>
        <div class="nav-actions">
          <ng-container *ngIf="auth.isLoggedIn; else loggedOut">
            <a routerLink="/profile" class="profile-nav-link" title="Open my profile">
              <span class="profile-nav-avatar">
                <ng-container *ngIf="profileImages.imageUrl$ | async as profileImage; else headerInitials"><img [src]="profileImage" alt=""></ng-container>
                <ng-template #headerInitials>{{ initials }}</ng-template>
              </span>
              <span class="user-name">{{ auth.displayName }}</span>
            </a>
            <a routerLink="/security" class="btn btn-ghost btn-small">Security</a>
            <button class="btn btn-ghost btn-small" type="button" (click)="logout()">Log out</button>
          </ng-container>
          <ng-template #loggedOut>
            <a routerLink="/login" class="btn btn-ghost btn-small">Log in</a>
            <a routerLink="/register" class="btn btn-primary btn-small">Register</a>
          </ng-template>
        </div>
      </div>
    </header>

    <main><router-outlet /></main>

    <footer class="site-footer">
      <div class="shell footer-grid">
        <div><strong>{{ practiceName }}</strong><p>Professional dental care with simpler online booking.</p></div>
        <div><strong>Patient portal</strong><p>Securely manage your appointments and contact details.</p></div>
      </div>
    </footer>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly profileImages = inject(ProfileImageService);
  readonly practiceName = environment.practiceName;
  private readonly router = inject(Router);
  private navigationSubscription?: Subscription;

  get initials(): string {
    const parts = this.auth.displayName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return `${parts[0][0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''}`.toUpperCase();
  }

  ngOnInit(): void {
    this.refreshHeaderPhoto();
    this.navigationSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.refreshHeaderPhoto());
  }

  ngOnDestroy(): void { this.navigationSubscription?.unsubscribe(); }

  logout(): void {
    this.profileImages.clear();
    this.auth.logout();
  }

  private refreshHeaderPhoto(): void {
    if (this.auth.isLoggedIn) this.profileImages.load();
    else this.profileImages.clear();
  }
}
