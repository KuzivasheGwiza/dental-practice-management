import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DentalService } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-hero"><div class="shell"><span class="eyebrow">Our services</span><h1>Dental care for routine, cosmetic and urgent needs.</h1><p>Service names and durations are managed by the practice and can be updated from the administration dashboard.</p></div></section>
    <section class="section shell">
      <div class="card-grid three">
        <article class="service-card" *ngFor="let item of services">
          <span class="pill" *ngIf="item.isEmergencyService">Emergency</span>
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
          <div class="service-meta"><span>{{ item.defaultDurationMinutes }} min</span><span *ngIf="item.startingPrice">From R{{ item.startingPrice | number:'1.0-0' }}</span></div>
        </article>
      </div>
      <div class="cta-band"><div><h2>Ready to schedule your visit?</h2><p>Sign in to view live availability.</p></div><a [routerLink]="auth.hasRole('Patient') ? '/book' : '/login'" class="btn btn-primary">Book appointment</a></div>
    </section>
  `
})
export class ServicesComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  services: DentalService[] = [];
  ngOnInit(): void { this.api.get<DentalService[]>('/services').subscribe(x => this.services = x); }
}
