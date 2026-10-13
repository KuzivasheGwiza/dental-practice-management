import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';
import { Appointment, PayFastCheckout } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell dashboard-heading"><div><span class="eyebrow">Patient portal</span><h1>My appointments</h1><p>View appointments, payment status and manage your bookings.</p></div><a routerLink="/book" class="btn btn-primary">+ Book appointment</a></div></section>
    <section class="section shell">
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <p><a routerLink="/security">Verify your email and protect your account</a> ? <a routerLink="/information">Visit preparation and cancellation policy</a></p><div class="stat-grid three">
        <div class="stat"><span>Upcoming</span><strong>{{ upcoming.length }}</strong></div>
        <div class="stat"><span>Completed</span><strong>{{ completed.length }}</strong></div>
        <div class="stat"><span>All bookings</span><strong>{{ appointments.length }}</strong></div>
      </div>

      <div class="section-heading small"><h2>Upcoming appointments</h2></div>
      <div class="appointment-list" *ngIf="upcoming.length; else noUpcoming">
        <article class="appointment-card" *ngFor="let item of upcoming">
          <div class="date-box"><strong>{{ item.startDateTime | date:'dd' }}</strong><span>{{ item.startDateTime | date:'MMM' }}</span></div>
          <div class="appointment-main">
            <div class="inline-badges"><span class="pill">{{ item.status }}</span><span class="pill neutral">{{ paymentLabel(item) }}</span></div>
            <h3>{{ item.serviceName }}</h3>
            <p>{{ item.startDateTime | date:'EEEE, d MMMM y' }} · {{ item.startDateTime | date:'shortTime' }} · {{ item.dentistName }}</p>
            <small>Reference {{ item.bookingReference }}</small>
            <small *ngIf="item.paymentMethod === 'PAYFAST' && item.amountDueAtBooking > 0">Online booking payment: {{ item.amountDueAtBooking | currency:'ZAR':'symbol-narrow' }}</small>
            <small *ngIf="needsPayFastPayment(item) && item.paymentExpiresAtUtc">Payment hold expires {{ item.paymentExpiresAtUtc | date:'short' }}</small>
          </div>
          <div class="appointment-actions"><a class="btn btn-secondary btn-small" [routerLink]="['/receipt', item.appointmentId]">Payment statement</a>
            <button *ngIf="needsPayFastPayment(item)" class="btn btn-primary btn-small" type="button" (click)="payNow(item)" [disabled]="payingReference === item.bookingReference">{{ payingReference === item.bookingReference ? 'Opening PayFast…' : 'Pay now' }}</button>
            <button class="btn btn-ghost btn-small" type="button" (click)="reschedule(item)">Reschedule</button>
            <button class="btn btn-danger btn-small" type="button" (click)="cancel(item)">Cancel</button>
          </div>
        </article>
      </div>
      <ng-template #noUpcoming><div class="empty-state"><strong>No upcoming appointments</strong><span>When you're ready, choose an available time online.</span><a routerLink="/book" class="text-link">Book now →</a></div></ng-template>

      <div class="section-heading small"><h2>Appointment history</h2></div>
      <div class="table-wrap" *ngIf="history.length">
        <table><thead><tr><th>Date</th><th>Service</th><th>Dentist</th><th>Status</th><th>Payment</th><th>Reference</th></tr></thead><tbody><tr *ngFor="let item of history"><td>{{ item.startDateTime | date:'mediumDate' }}</td><td>{{ item.serviceName }}</td><td>{{ item.dentistName }}</td><td><span class="pill neutral">{{ item.status }}</span></td><td>{{ paymentLabel(item) }}</td><td>{{ item.bookingReference }} <a [routerLink]="['/receipt',item.appointmentId]">Statement</a></td></tr></tbody></table>
      </div>
    </section>
  `
})
export class PatientDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  appointments: Appointment[] = [];
  error = '';
  payingReference = '';

  get upcoming(): Appointment[] {
    return this.appointments.filter(x => !['Completed', 'Cancelled', 'No Show'].includes(x.status) && new Date(x.startDateTime) >= new Date()).sort((a, b) => +new Date(a.startDateTime) - +new Date(b.startDateTime));
  }
  get completed(): Appointment[] { return this.appointments.filter(x => x.status === 'Completed'); }
  get history(): Appointment[] { return this.appointments.filter(x => !this.upcoming.some(y => y.appointmentId === x.appointmentId)); }

  ngOnInit(): void { this.load(); }

  paymentLabel(item: Appointment): string {
    if (item.paymentStatus === 'REFUNDED') return 'Refunded';
    if (item.paymentStatus === 'PARTIALLY_REFUNDED') return 'Partially refunded';
    if (item.paymentMethod === 'CASH_AT_PRACTICE') return item.paymentStatus === 'PAID' ? 'Paid at practice' : 'Cash at practice';
    if (item.paymentStatus === 'PAID') return 'Paid online';
    if (item.paymentStatus === 'PAID_REVIEW_REQUIRED') return 'Payment under review';
    if (item.paymentStatus === 'EXPIRED') return 'Payment expired';
    if (item.paymentStatus === 'FAILED') return 'Payment failed';
    if (item.paymentStatus === 'CANCELLED') return 'Payment cancelled';
    return 'Payment required';
  }

  needsPayFastPayment(item: Appointment): boolean {
    return item.paymentMethod === 'PAYFAST' && !item.isSecured && ['PENDING', 'FAILED', 'CANCELLED'].includes(item.paymentStatus) && item.status === 'Pending';
  }

  payNow(item: Appointment): void {
    this.error = ''; this.payingReference = item.bookingReference;
    this.api.post<PayFastCheckout>(`/payments/appointments/${encodeURIComponent(item.bookingReference)}/payfast-checkout`, {}).subscribe({
      next: checkout => this.redirectToPayFast(checkout),
      error: err => { this.payingReference = ''; this.error = errorMessage(err, 'PayFast checkout could not be opened.'); this.load(); }
    });
  }

  cancel(item: Appointment): void {
    const reason = window.prompt('Please enter a short cancellation reason:');
    if (!reason?.trim()) return;
    const paidWarning = item.amountPaid > 0 ? '\n\nThis appointment has a recorded online payment. Cancelling does not automatically issue a PayFast refund; the practice must review the refund.' : '';
    if (!window.confirm(`Cancel ${item.serviceName} on ${new Date(item.startDateTime).toLocaleString()}?${paidWarning}`)) return;
    this.api.put<void>(`/appointments/${item.appointmentId}/cancel`, { reason: reason.trim() }).subscribe({
      next: () => this.load(), error: err => this.error = errorMessage(err, 'Could not cancel the appointment.')
    });
  }

  reschedule(item: Appointment): void {
    const value = window.prompt('Enter the new date and time as YYYY-MM-DDTHH:MM. The time must be an available slot.', item.startDateTime.slice(0, 16));
    if (!value) return;
    this.api.put<Appointment>(`/appointments/${item.appointmentId}/reschedule`, { newStartDateTime: value }).subscribe({
      next: () => this.load(), error: err => this.error = errorMessage(err, 'Could not reschedule. Use the booking page to check available times first.')
    });
  }

  private redirectToPayFast(checkout: PayFastCheckout): void {
    const form = document.createElement('form');
    form.method = 'post'; form.action = checkout.paymentUrl; form.style.display = 'none';
    for (const [name, value] of Object.entries(checkout.fields)) {
      const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  private load(): void {
    this.error = '';
    this.api.get<Appointment[]>('/appointments').subscribe({ next: x => this.appointments = x, error: err => this.error = errorMessage(err) });
  }
}
