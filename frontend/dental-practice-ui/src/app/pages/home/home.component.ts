import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DentalService, Practice } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="shell hero-grid">
        <div>
          <span class="eyebrow">Modern dental care</span>
          <h1>Healthy smiles. Easier appointments.</h1>
          <p class="hero-copy">Book online, manage your appointments through the patient portal, and stay connected with your dental practice.</p>
          <div class="hero-actions">
            <a *ngIf="auth.hasRole('Patient'); else publicBook" routerLink="/book" class="btn btn-primary">Book an appointment</a>
            <ng-template #publicBook><a routerLink="/register" class="btn btn-primary">Book an appointment</a></ng-template>
            <a routerLink="/services" class="btn btn-secondary">Explore services</a>
          </div>
          <div class="trust-row"><span>Online booking</span><span>Patient portal</span><span>Secure accounts</span></div>
        </div>
        <aside class="hero-card">
          <div class="hero-card-top"><span>Next available</span><strong>Book online</strong></div>
          <div class="mini-calendar">
            <div><small>Step 1</small><strong>Choose service</strong></div>
            <div><small>Step 2</small><strong>Select dentist</strong></div>
            <div><small>Step 3</small><strong>Pick a time</strong></div>
          </div>
          <a *ngIf="auth.hasRole('Patient')" routerLink="/book" class="text-link">View available times →</a>
          <a *ngIf="!auth.isLoggedIn" routerLink="/login" class="text-link">Patient login →</a>
        </aside>
      </div>
    </section>

    <section class="section shell">
      <div class="section-heading"><span class="eyebrow">What we offer</span><h2>Dental services built around your needs</h2></div>
      <div class="card-grid three">
        <article class="service-card" *ngFor="let service of services.slice(0, 6)">
          <div class="service-icon">+</div>
          <h3>{{ service.name }}</h3>
          <p>{{ service.description || 'Professional dental care delivered by the practice team.' }}</p>
          <span class="duration">Approx. {{ service.defaultDurationMinutes }} min</span>
        </article>
      </div>
      <div class="center"><a routerLink="/services" class="btn btn-secondary">View all services</a></div>
    </section>

    <section class="section soft-section">
      <div class="shell split">
        <div><span class="eyebrow">Patient portal</span><h2>Your appointments, in one place.</h2><p>Registered patients can book appointments, review upcoming visits, reschedule or cancel when needed, and keep their contact details up to date.</p></div>
        <div class="feature-list">
          <div><strong>01</strong><span>Book available appointment slots online</span></div>
          <div><strong>02</strong><span>See upcoming and previous appointments</span></div>
          <div><strong>03</strong><span>Receive booking and reminder notifications</span></div>
        </div>
      </div>
    </section>

    <section class="section shell" *ngIf="practice">
      <div class="contact-card">
        <div><span class="eyebrow">Contact</span><h2>{{ practice.name }}</h2><p>{{ practice.city }}<span *ngIf="practice.province">, {{ practice.province }}</span></p></div>
        <div class="contact-details"><span *ngIf="practice.phone"><strong>Phone</strong>{{ practice.phone }}</span><span *ngIf="practice.email"><strong>Email</strong>{{ practice.email }}</span></div>
      </div>
    </section>
  `
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  services: DentalService[] = [];
  practice?: Practice;

  ngOnInit(): void {
    this.api.get<DentalService[]>('/services').subscribe(x => this.services = x);
    this.api.get<Practice>('/practice').subscribe(x => this.practice = x);
  }
}
