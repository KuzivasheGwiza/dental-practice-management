import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AppointmentPaymentStatus } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell"><span class="eyebrow">PayFast payment</span><h1>Checking your payment</h1><p>We are confirming the payment directly with PayFast.</p></div></section>
    <section class="section shell"><div class="panel payment-result-card">
      <div *ngIf="loading"><h2>Verification in progress…</h2><p class="muted">Do not make a second payment. This usually updates within a few seconds.</p></div>
      <div *ngIf="status?.isSecured && status?.paymentStatus === 'PAID'" class="success-card compact-result"><span class="success-mark">✓</span><div><span class="eyebrow">Payment verified</span><h2>Appointment secured</h2><p>We received {{ status?.amountPaid | currency:'ZAR':'symbol-narrow' }} through PayFast.</p><strong>Reference: {{ status?.bookingReference }}</strong></div></div>
      <div *ngIf="status?.paymentStatus === 'PAID_REVIEW_REQUIRED'" class="alert error"><strong>Payment received, appointment needs review.</strong> The payment arrived after the reservation could safely be confirmed. The practice must review the payment and appointment before further action.</div>
      <div *ngIf="!loading && status && !status.isSecured && status.paymentStatus !== 'PAID_REVIEW_REQUIRED'" class="alert"><strong>Payment not verified yet.</strong> Current payment status: {{ status.paymentStatus }}. Check My Appointments before trying again.</div>
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <div class="inline-actions"><a routerLink="/patient" class="btn btn-primary">My appointments</a><a routerLink="/book" class="btn btn-secondary">Book another</a></div>
    </div></section>
  `
})
export class PayFastReturnComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private timer?: number;
  private attempts = 0;
  loading = true;
  error = '';
  status?: AppointmentPaymentStatus;

  ngOnInit(): void {
    const reference = this.route.snapshot.queryParamMap.get('bookingReference');
    if (!reference) { this.loading = false; this.error = 'The booking reference is missing from the PayFast return URL.'; return; }
    this.check(reference);
  }

  ngOnDestroy(): void { if (this.timer) window.clearTimeout(this.timer); }

  private check(reference: string): void {
    this.api.get<AppointmentPaymentStatus>(`/payments/appointments/${encodeURIComponent(reference)}`).subscribe({
      next: x => {
        this.status = x; this.attempts++;
        if (x.isSecured || x.paymentStatus === 'PAID_REVIEW_REQUIRED' || this.attempts >= 10) { this.loading = false; return; }
        this.timer = window.setTimeout(() => this.check(reference), 2000);
      },
      error: () => { this.loading = false; this.error = 'We could not read the payment status. Please open My Appointments to check the booking.'; }
    });
  }
}
