import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PortalContent } from '../information/information.component';
import { errorMessage } from '../../core/http-error';
import { Appointment, AvailabilitySlot, BookingResponse, DentalService, Dentist, PayFastCheckout, PaymentConfig, Practice } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell"><span class="eyebrow">Online booking</span><h1>Book an appointment</h1><p>Choose a service, dentist, live time slot and how you would like to pay.</p></div></section>
    <section class="section shell booking-shell">
      <div *ngIf="success" class="success-card">
        <span class="success-mark">✓</span><div><span class="eyebrow">Appointment confirmed</span><h2>{{ success.serviceName }}</h2><p>{{ success.startDateTime | date:'fullDate' }} at {{ success.startDateTime | date:'shortTime' }} with {{ success.dentistName }}.</p><p><strong>Payment:</strong> Cash at the practice.</p><p *ngIf="practice">Location: {{practice.name}}, {{practice.addressLine1}} {{practice.city}}</p><p class="preserve-lines" *ngIf="content">{{content.preparationInstructions}}</p><strong>Reference: {{ success.bookingReference }}</strong><div class="inline-actions"><a routerLink="/patient" class="btn btn-primary">My appointments</a><button class="btn btn-secondary" type="button" (click)="resetBooking()">Book another</button></div></div>
      </div>

      <form *ngIf="!success" [formGroup]="form" (ngSubmit)="submit()" class="booking-grid">
        <div class="panel">
          <h2>1. Appointment details</h2>
          <div *ngIf="error" class="alert error">{{ error }}</div>
          <div class="form-stack">
            <label>Service
              <select formControlName="serviceId" (change)="serviceChanged()">
                <option [ngValue]="0">Select a service</option>
                <option *ngFor="let item of services" [ngValue]="item.serviceId">{{ item.name }} · {{ item.defaultDurationMinutes }} min</option>
              </select>
            </label>
            <label>Dentist
              <select formControlName="dentistId" (change)="dentistChanged()" [disabled]="dentists.length === 0">
                <option [ngValue]="0">Select a dentist</option>
                <option *ngFor="let item of dentists" [ngValue]="item.dentistId">{{ item.name }}<ng-container *ngIf="item.qualifications"> · {{ item.qualifications }}</ng-container></option>
              </select>
            </label>
            <label>Date<input type="date" formControlName="date" [min]="minDate" (change)="dateChanged()"></label>
            <label>Notes <span class="optional">optional</span><textarea rows="4" formControlName="patientNotes" placeholder="Anything the practice should know about this appointment request"></textarea></label>
          </div>
        </div>

        <div class="panel">
          <h2>2. Available times</h2>
          <p class="muted" *ngIf="!canLoadSlots">Select a service, dentist and date first.</p>
          <p class="muted" *ngIf="loadingSlots">Checking availability…</p>
          <div class="slot-grid" *ngIf="!loadingSlots && slots.length">
            <button type="button" *ngFor="let slot of slots" class="slot" [class.selected]="form.controls.startDateTime.value === slot.startDateTime" (click)="selectSlot(slot)">{{ slot.startDateTime | date:'shortTime' }}</button>
          </div>
          <div class="empty-state" *ngIf="canLoadSlots && !loadingSlots && loadedSlots && slots.length === 0"><strong>No times available</strong><span>Try another date or dentist.</span></div>
          <p *ngIf="content">Online changes: up to {{content.changeDeadlineHours}} hours before your appointment. <a routerLink="/information">Read booking and refund policies</a>.</p><div class="booking-summary" *ngIf="form.controls.startDateTime.value"><span>Selected</span><strong>{{ form.controls.startDateTime.value | date:'fullDate' }}</strong><strong>{{ form.controls.startDateTime.value | date:'shortTime' }}</strong></div>

          <div class="payment-section" *ngIf="form.controls.startDateTime.value">
            <h2>3. Payment</h2>
            <label class="payment-choice" [class.selected]="form.controls.paymentMethod.value === 'CASH_AT_PRACTICE'">
              <input type="radio" formControlName="paymentMethod" value="CASH_AT_PRACTICE">
              <span><strong>Pay cash at the practice</strong><small>Your appointment is confirmed now and payment is handled when you attend.</small></span>
            </label>
            <label class="payment-choice" [class.selected]="form.controls.paymentMethod.value === 'PAYFAST'" [class.disabled]="!payFastAvailableForSelectedService">
              <input type="radio" formControlName="paymentMethod" value="PAYFAST" [disabled]="!payFastAvailableForSelectedService">
              <span><strong>Pay online with PayFast</strong><small *ngIf="selectedService?.bookingPaymentAmount">Pay {{ selectedService?.bookingPaymentAmount | currency:'ZAR':'symbol-narrow' }} now to secure the appointment.</small><small *ngIf="!selectedService?.bookingPaymentAmount">Online payment amount has not been configured for this service.</small></span>
            </label>
            <div class="payment-note" *ngIf="form.controls.paymentMethod.value === 'PAYFAST' && paymentConfig">
              The time slot is held for {{ paymentConfig.paymentWindowMinutes }} minutes while payment is completed. The appointment is confirmed only after PayFast verifies the payment.
            </div>
            <div class="payment-note warning" *ngIf="paymentConfig && !paymentConfig.payFastEnabled">PayFast is currently unavailable. Cash at the practice remains available.</div>
          </div>

          <button class="btn btn-primary full" type="submit" [disabled]="!canSubmit">{{ submitLabel }}</button>
        </div>
      </form>
    </section>
  `
})
export class BookComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  services: DentalService[] = [];
  dentists: Dentist[] = [];
  slots: AvailabilitySlot[] = [];
  paymentConfig?: PaymentConfig; practice?:Practice; content?:PortalContent;
  loadingSlots = false;
  loadedSlots = false;
  submitting = false;
  error = '';
  success?: Appointment;
  readonly minDate = new Date().toISOString().slice(0, 10);

  readonly form = this.fb.nonNullable.group({
    serviceId: [0, Validators.min(1)],
    dentistId: [0, Validators.min(1)],
    date: ['', Validators.required],
    startDateTime: ['', Validators.required],
    patientNotes: [''],
    paymentMethod: ['CASH_AT_PRACTICE', Validators.required]
  });

  get selectedService(): DentalService | undefined {
    return this.services.find(x => x.serviceId === this.form.controls.serviceId.value);
  }

  get payFastAvailableForSelectedService(): boolean {
    return !!this.paymentConfig?.payFastEnabled && (this.selectedService?.bookingPaymentAmount ?? 0) >= (this.paymentConfig?.minimumAmount ?? 5);
  }

  get canLoadSlots(): boolean {
    return this.form.controls.serviceId.value > 0 && this.form.controls.dentistId.value > 0 && !!this.form.controls.date.value;
  }

  get canSubmit(): boolean {
    const selected = !!this.form.controls.startDateTime.value && this.form.controls.serviceId.value > 0 && this.form.controls.dentistId.value > 0;
    const methodOk = this.form.controls.paymentMethod.value !== 'PAYFAST' || this.payFastAvailableForSelectedService;
    return selected && methodOk && !this.submitting;
  }

  get submitLabel(): string {
    if (this.submitting) return this.form.controls.paymentMethod.value === 'PAYFAST' ? 'Opening PayFast…' : 'Confirming…';
    return this.form.controls.paymentMethod.value === 'PAYFAST' ? 'Continue to PayFast' : 'Confirm appointment';
  }

  ngOnInit(): void {
    this.api.get<Practice>('/practice').subscribe({next:x=>this.practice=x,error:e=>this.error=errorMessage(e)});
    this.api.get<PortalContent>('/portal/content').subscribe({next:x=>this.content=x,error:e=>this.error=errorMessage(e)});
    this.api.get<DentalService[]>('/services').subscribe(x => this.services = x);
    this.api.get<PaymentConfig>('/payments/config').subscribe({ next: x => this.paymentConfig = x, error: () => this.paymentConfig = { payFastEnabled: false, paymentWindowMinutes: 15, minimumAmount: 5, currency: 'ZAR' } });
  }

  serviceChanged(): void {
    this.form.patchValue({ dentistId: 0, startDateTime: '' });
    if (this.form.controls.paymentMethod.value === 'PAYFAST' && !this.payFastAvailableForSelectedService)
      this.form.controls.paymentMethod.setValue('CASH_AT_PRACTICE');
    this.dentists = []; this.slots = []; this.loadedSlots = false;
    const id = this.form.controls.serviceId.value;
    if (id > 0) this.api.get<Dentist[]>(`/dentists?serviceId=${id}`).subscribe(x => this.dentists = x);
  }

  dentistChanged(): void { this.form.patchValue({ startDateTime: '' }); this.slots = []; this.loadedSlots = false; this.tryLoadSlots(); }
  dateChanged(): void { this.form.patchValue({ startDateTime: '' }); this.slots = []; this.loadedSlots = false; this.tryLoadSlots(); }
  selectSlot(slot: AvailabilitySlot): void { this.form.controls.startDateTime.setValue(slot.startDateTime); }

  submit(): void {
    if (!this.canSubmit) return;
    this.submitting = true; this.error = '';
    const value = this.form.getRawValue();
    this.api.post<BookingResponse>('/appointments', {
      dentistId: value.dentistId,
      serviceId: value.serviceId,
      startDateTime: value.startDateTime,
      patientNotes: value.patientNotes || null,
      paymentMethod: value.paymentMethod
    }).subscribe({
      next: response => {
        if (value.paymentMethod === 'PAYFAST') {
          if (!response.payFast) {
            this.submitting = false;
            this.error = 'The appointment was created but PayFast checkout could not be started. Open My Appointments to retry payment.';
            return;
          }
          this.redirectToPayFast(response.payFast);
          return;
        }
        this.submitting = false;
        this.success = response.appointment;
      },
      error: err => { this.submitting = false; this.error = errorMessage(err, 'The appointment could not be created.'); this.tryLoadSlots(); }
    });
  }

  resetBooking(): void {
    this.success = undefined; this.error = ''; this.dentists = []; this.slots = []; this.loadedSlots = false;
    this.form.reset({ serviceId: 0, dentistId: 0, date: '', startDateTime: '', patientNotes: '', paymentMethod: 'CASH_AT_PRACTICE' });
  }

  private redirectToPayFast(checkout: PayFastCheckout): void {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = checkout.paymentUrl;
    form.style.display = 'none';
    for (const [name, value] of Object.entries(checkout.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = name; input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  private tryLoadSlots(): void {
    if (!this.canLoadSlots) return;
    this.loadingSlots = true; this.loadedSlots = false; this.error = '';
    const v = this.form.getRawValue();
    this.api.get<AvailabilitySlot[]>(`/availability?dentistId=${v.dentistId}&serviceId=${v.serviceId}&date=${encodeURIComponent(v.date)}`).subscribe({
      next: x => { this.slots = x; this.loadingSlots = false; this.loadedSlots = true; },
      error: err => { this.loadingSlots = false; this.loadedSlots = true; this.error = errorMessage(err, 'Could not load availability.'); }
    });
  }
}
