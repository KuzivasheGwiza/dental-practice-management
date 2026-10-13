import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell"><span class="eyebrow">PayFast checkout</span><h1>Payment cancelled</h1><p>Your payment was not completed.</p></div></section>
    <section class="section shell"><div class="panel payment-result-card">
      <div *ngIf="loading"><h2>Releasing the appointment hold…</h2></div>
      <div *ngIf="released" class="alert"><strong>No verified payment is currently recorded.</strong> The unpaid appointment hold has been released so the time can be booked again. If you see a PayFast debit despite cancelling, contact the practice before making another payment.</div>
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <div class="inline-actions"><a routerLink="/book" class="btn btn-primary">Choose another appointment</a><a routerLink="/patient" class="btn btn-secondary">My appointments</a></div>
    </div></section>
  `
})
export class PayFastCancelComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  released = false;
  error = '';

  ngOnInit(): void {
    const reference = this.route.snapshot.queryParamMap.get('bookingReference');
    if (!reference) { this.loading = false; this.error = 'The booking reference is missing.'; return; }
    this.api.post<void>(`/payments/appointments/${encodeURIComponent(reference)}/cancel-pending`, {}).subscribe({
      next: () => { this.loading = false; this.released = true; },
      error: err => { this.loading = false; this.error = errorMessage(err, 'The booking could not be released automatically. Check My Appointments before making another booking.'); }
    });
  }
}
