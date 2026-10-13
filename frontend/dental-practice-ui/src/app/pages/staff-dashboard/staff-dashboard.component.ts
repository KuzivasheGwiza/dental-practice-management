import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { Appointment, AvailabilitySlot, DentalService, Dentist } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell dashboard-heading"><div><span class="eyebrow">Practice operations</span><h1>Staff dashboard</h1><p>Manage the daily appointment schedule and create bookings for patients who contact the practice directly.</p></div></div></section>
    <section class="section shell">
      <div class="inline-actions"><a *ngIf="canRecordCash" routerLink="/reports" class="btn btn-secondary">Practice reports</a></div><div *ngIf="error" class="alert error">{{ error }}</div>
      <div class="staff-layout">
        <div>
          <div class="panel toolbar-panel"><label>View<select [(ngModel)]="scheduleView" (change)="loadAppointments()"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label><label>Schedule date<input type="date" [(ngModel)]="scheduleDate" (change)="loadAppointments()"></label><div><strong>{{ appointments.length }}</strong><span> appointments</span></div></div>
          <div class="calendar-grid" *ngIf="scheduleView !== 'day'"><article *ngFor="let day of scheduleDays" class="calendar-day"><strong>{{day | date:'EEE, d MMM'}}</strong><p *ngFor="let item of forDay(day)">{{item.startDateTime | date:'shortTime'}} ? {{item.patientName}}<br><small>{{item.serviceName}} ? {{item.status}}</small></p></article></div>
          <div *ngIf="rescheduling" class="panel form-stack"><h2>Reschedule {{rescheduling.patientName}}</h2><label>New date<input type="date" [(ngModel)]="rescheduleDate" [min]="minDate" (change)="loadRescheduleSlots()"></label><label>Available time<select [(ngModel)]="rescheduleSlot"><option value="">Choose a time</option><option *ngFor="let slot of rescheduleSlots" [value]="slot.startDateTime">{{slot.startDateTime | date:'shortTime'}}</option></select></label><button class="btn btn-primary" (click)="saveReschedule()" [disabled]="!rescheduleSlot || creating">Save new time</button><button class="btn btn-ghost" (click)="rescheduling=undefined">Close</button></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Patient</th><th>Service</th><th>Dentist</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let item of appointments">
                  <td><strong>{{ item.startDateTime | date:'EEE, d MMM HH:mm' }}</strong></td><td>{{ item.patientName }}<small class="table-sub">{{ item.bookingReference }}</small></td><td>{{ item.serviceName }}</td><td>{{ item.dentistName }}</td><td><span class="pill neutral">{{ item.status }}</span></td>
                  <td><span class="pill" [class.neutral]="item.paymentStatus !== 'PAID'">{{ paymentLabel(item) }}</span><small class="table-sub" *ngIf="item.amountPaid > 0">{{ item.amountPaid | currency:'ZAR':'symbol-narrow' }} received</small><button *ngIf="canRecordCash && item.paymentMethod === 'CASH_AT_PRACTICE' && !['PAID','REFUNDED','PARTIALLY_REFUNDED'].includes(item.paymentStatus) && item.status !== 'Cancelled'" class="btn btn-ghost btn-small" type="button" (click)="recordCash(item)">Record cash</button></td>
                  <td><a [routerLink]="['/receipt',item.appointmentId]">Statement</a><button class="btn btn-ghost btn-small" (click)="startReschedule(item)">Reschedule</button><button *ngIf="canRecordCash && item.amountPaid > 0" class="btn btn-ghost btn-small" (click)="refund(item)">Record refund</button><select class="compact-select" [value]="statusToCode(item.status)" (change)="statusChanged(item, $event)"><option value="PENDING" *ngIf="item.status === 'Pending'">Pending</option><option value="CONFIRMED">Confirmed</option><option value="CHECKED_IN">Checked In</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="NO_SHOW">No Show</option><option value="CANCELLED">Cancelled</option></select></td>
                </tr>
                <tr *ngIf="appointments.length === 0"><td colspan="7"><div class="empty-inline">No appointments on this date.</div></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="panel sticky-panel">
          <span class="eyebrow">Reception booking</span><h2>New appointment</h2><p class="muted">Use this for phone, WhatsApp or walk-in bookings.</p>
          <label>Find existing patient<input [(ngModel)]="patientSearch" placeholder="Name, email or phone"></label><button class="btn btn-secondary" type="button" (click)="findPatients()">Find patient</button><div class="mini-list"><button *ngFor="let p of patientResults" class="btn btn-ghost" (click)="selectPatient(p)">{{p.firstName}} {{p.lastName}} ? {{p.phoneNumber}}</button></div>
          <form [formGroup]="bookingForm" (ngSubmit)="createBooking()" class="form-stack">
            <div class="form-grid two tight"><label>First name<input formControlName="firstName" (input)="selectedPatientId=undefined"></label><label>Last name<input formControlName="lastName" (input)="selectedPatientId=undefined"></label></div>
            <label>Email<input type="email" formControlName="email" (input)="selectedPatientId=undefined"></label><label>Phone<input formControlName="phoneNumber" (input)="selectedPatientId=undefined"></label>
            <label>Source<select formControlName="bookingSource"><option>Receptionist</option><option>Phone</option><option>WhatsApp</option><option>Walk-in</option></select></label>
            <label>Service<select formControlName="serviceId" (change)="serviceChanged()"><option [ngValue]="0">Select service</option><option *ngFor="let s of services" [ngValue]="s.serviceId">{{ s.name }}</option></select></label>
            <label>Dentist<select formControlName="dentistId" (change)="loadSlots()"><option [ngValue]="0">Select dentist</option><option *ngFor="let d of dentists" [ngValue]="d.dentistId">{{ d.name }}</option></select></label>
            <label>Date<input type="date" formControlName="date" [min]="minDate" (change)="loadSlots()"></label>
            <label>Available time<select formControlName="startDateTime"><option value="">Select a time</option><option *ngFor="let slot of slots" [value]="slot.startDateTime">{{ slot.startDateTime | date:'shortTime' }}</option></select></label>
            <label>Patient notes<textarea rows="3" formControlName="patientNotes"></textarea></label>
            <button class="btn btn-primary full" type="submit" [disabled]="bookingForm.invalid || !bookingForm.controls.startDateTime.value || creating">{{ creating ? 'Creating…' : 'Create appointment' }}</button>
          </form>
        </aside>
      </div>
    </section>
  `
})
export class StaffDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  appointments: Appointment[] = [];
  services: DentalService[] = [];
  dentists: Dentist[] = [];
  slots: AvailabilitySlot[] = [];
  error = '';
  creating = false;
  readonly minDate = new Date().toISOString().slice(0, 10);
  scheduleDate = this.minDate; scheduleView='day';
  rescheduling?:Appointment;rescheduleDate='';rescheduleSlot='';rescheduleSlots:AvailabilitySlot[]=[];
  patientSearch='';patientResults:{patientId:number;firstName:string;lastName:string;email:string;phoneNumber:string}[]=[];selectedPatientId?:number;
  get scheduleDays():Date[] { const start=new Date(this.scheduleDate+'T00:00:00');if(this.scheduleView==='week')start.setDate(start.getDate()-((start.getDay()+6)%7));if(this.scheduleView==='month')start.setDate(1);const count=this.scheduleView==='month'?new Date(start.getFullYear(),start.getMonth()+1,0).getDate():7;return Array.from({length:count},(_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i)); }
  forDay(day:Date):Appointment[]{return this.appointments.filter(x=>new Date(x.startDateTime).toDateString()===day.toDateString());}
  findPatients():void{this.api.get<typeof this.patientResults>(`/portal/patients?q=${encodeURIComponent(this.patientSearch)}`).subscribe({next:x=>this.patientResults=x,error:e=>this.error=errorMessage(e)});}
  selectPatient(p:typeof this.patientResults[number]):void{this.bookingForm.patchValue({firstName:p.firstName,lastName:p.lastName,email:p.email,phoneNumber:p.phoneNumber});this.selectedPatientId=p.patientId;this.patientResults=[];}
  startReschedule(item:Appointment):void{this.rescheduling=item;this.rescheduleDate='';this.rescheduleSlots=[];this.rescheduleSlot='';}
  loadRescheduleSlots():void{this.rescheduleSlot='';this.rescheduleSlots=[];const item=this.rescheduling;if(item&&this.rescheduleDate)this.api.get<AvailabilitySlot[]>(`/availability?dentistId=${item.dentistId}&serviceId=${item.serviceId}&date=${this.rescheduleDate}`).subscribe({next:x=>this.rescheduleSlots=x,error:e=>this.error=errorMessage(e)});}
  saveReschedule():void{if(!this.rescheduling||!this.rescheduleSlot)return;this.creating=true;this.api.put(`/staff/appointments/${this.rescheduling.appointmentId}/reschedule`,{newStartDateTime:this.rescheduleSlot}).subscribe({next:()=>{this.creating=false;this.rescheduling=undefined;this.loadAppointments();},error:e=>{this.creating=false;this.error=errorMessage(e);}});}
  refund(item:Appointment):void{const value=prompt('Amount already refunded to the patient (R):');if(value===null)return;const amount=Number(value);if(!Number.isFinite(amount)||amount<=0){this.error='Enter a positive refund amount.';return;}const reason=prompt('Reason for the completed refund:');const externalReference=prompt('Unique PayFast refund reference or cash refund receipt number:');if(!reason||!externalReference)return;if(!confirm('Confirm this refund has already been paid to the patient. This only records the refund.'))return;this.api.post(`/portal/refunds/${item.appointmentId}`,{amount,reason,externalReference}).subscribe({next:()=>this.loadAppointments(),error:e=>this.error=errorMessage(e)});}


  get canRecordCash(): boolean {
    return this.auth.hasRole('Receptionist') || this.auth.hasRole('Administrator');
  }

  readonly bookingForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], phoneNumber: ['', Validators.required],
    bookingSource: ['Receptionist', Validators.required], serviceId: [0, Validators.min(1)], dentistId: [0, Validators.min(1)], date: ['', Validators.required], startDateTime: ['', Validators.required], patientNotes: ['']
  });

  ngOnInit(): void {
    this.loadAppointments();
    this.api.get<DentalService[]>('/services').subscribe(x => this.services = x);
  }

  loadAppointments(): void {
    this.api.get<Appointment[]>(`/staff/appointments?date=${encodeURIComponent(this.scheduleDate)}&view=${this.scheduleView}`).subscribe({ next: x => this.appointments = x, error: err => this.error = errorMessage(err) });
  }

  serviceChanged(): void {
    this.bookingForm.patchValue({ dentistId: 0, startDateTime: '' }); this.dentists = []; this.slots = [];
    const id = this.bookingForm.controls.serviceId.value;
    if (id > 0) this.api.get<Dentist[]>(`/dentists?serviceId=${id}`).subscribe(x => this.dentists = x);
  }

  loadSlots(): void {
    this.bookingForm.controls.startDateTime.setValue(''); this.slots = [];
    const v = this.bookingForm.getRawValue();
    if (v.serviceId < 1 || v.dentistId < 1 || !v.date) return;
    this.api.get<AvailabilitySlot[]>(`/availability?dentistId=${v.dentistId}&serviceId=${v.serviceId}&date=${encodeURIComponent(v.date)}`).subscribe({ next: x => this.slots = x, error: err => this.error = errorMessage(err) });
  }

  createBooking(): void {
    if (this.bookingForm.invalid) return;
    this.creating = true; this.error = '';
    const v = this.bookingForm.getRawValue();
    this.api.post<Appointment>('/staff/appointments', { patientId: this.selectedPatientId ?? null, firstName: v.firstName, lastName: v.lastName, email: v.email, phoneNumber: v.phoneNumber, dentistId: v.dentistId, serviceId: v.serviceId, startDateTime: v.startDateTime, patientNotes: v.patientNotes || null, bookingSource: v.bookingSource }).subscribe({
      next: () => { this.creating = false; this.selectedPatientId=undefined; this.scheduleDate = v.date; this.bookingForm.reset({ firstName:'', lastName:'', email:'', phoneNumber:'', bookingSource:'Receptionist', serviceId:0, dentistId:0, date:'', startDateTime:'', patientNotes:'' }); this.dentists=[]; this.slots=[]; this.loadAppointments(); },
      error: err => { this.creating = false; this.error = errorMessage(err, 'Could not create the appointment.'); this.loadSlots(); }
    });
  }

  recordCash(item: Appointment): void {
    const entered = window.prompt(`Cash amount received for ${item.patientName}:`, '');
    if (entered === null) return;
    const amount = Number(entered.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) { this.error = 'Enter a valid cash amount greater than R0.00.'; return; }
    const notes = window.prompt('Optional cash payment note / receipt reference:', '') || null;
    if (!window.confirm(`Record a cash payment of R${amount.toFixed(2)} for ${item.bookingReference}?`)) return;
    this.api.post<void>(`/staff/appointments/${item.appointmentId}/payments/cash`, { amount, notes }).subscribe({
      next: () => this.loadAppointments(),
      error: err => { this.error = errorMessage(err, 'Could not record the cash payment.'); this.loadAppointments(); }
    });
  }

  paymentLabel(item: Appointment): string {
    if (item.paymentStatus === 'REFUNDED') return 'Refunded';
    if (item.paymentStatus === 'PARTIALLY_REFUNDED') return 'Partially refunded';
    if (item.paymentStatus === 'PAID') return item.paymentMethod === 'PAYFAST' ? 'PayFast paid' : 'Cash paid';
    if (item.paymentStatus === 'CASH_DUE') return 'Cash due';
    if (item.paymentStatus === 'PAID_REVIEW_REQUIRED') return 'Payment review';
    if (item.paymentStatus === 'EXPIRED') return 'Payment expired';
    if (item.paymentMethod === 'PAYFAST') return `PayFast ${item.paymentStatus.toLowerCase()}`;
    return item.paymentStatus.replaceAll('_', ' ');
  }

  statusChanged(item: Appointment, event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    if (!window.confirm(`Change ${item.patientName}'s appointment to ${code.replaceAll('_', ' ')}?`)) { this.loadAppointments(); return; }
    const internalNotes = code === 'CANCELLED' ? (window.prompt('Cancellation reason / internal note:') || 'Cancelled by practice') : null;
    this.api.put<void>(`/staff/appointments/${item.appointmentId}/status`, { statusCode: code, internalNotes }).subscribe({ next: () => this.loadAppointments(), error: err => { this.error = errorMessage(err); this.loadAppointments(); } });
  }

  statusToCode(status: string): string {
    const map: Record<string,string> = { 'Pending':'PENDING', 'Confirmed':'CONFIRMED', 'Checked In':'CHECKED_IN', 'In Progress':'IN_PROGRESS', 'Completed':'COMPLETED', 'Cancelled':'CANCELLED', 'No Show':'NO_SHOW' };
    return map[status] ?? 'CONFIRMED';
  }
}
