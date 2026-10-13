import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';
import { AdminSummary, AuditLog, DentalService, Dentist } from '../../core/models';

interface StaffItem {
  staffId: number; firstName: string; lastName: string; jobTitle: string; staffNumber?: string; isActive: boolean; email?: string; phoneNumber?: string; dentistId?: number; professionalNumber?: string;
}
interface AvailabilityItem {
  dentistAvailabilityId: number; dentistId: number; dayOfWeek: number; startTime: string; endTime: string; effectiveFrom: string; effectiveTo?: string; isActive: boolean;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-hero compact"><div class="shell"><span class="eyebrow">Administration</span><h1>Practice control centre</h1><p>Manage services, staff, dentist schedules and review system activity.</p></div></section>
    <section class="section shell">
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <div class="inline-actions"><a routerLink="/admin/settings" class="btn btn-secondary">Website, policies and leave</a><a routerLink="/reports" class="btn btn-secondary">Reports</a></div>
      <div class="stat-grid six" *ngIf="summary">
        <div class="stat"><span>Today</span><strong>{{ summary.todaysAppointments }}</strong></div><div class="stat"><span>Next 7 days</span><strong>{{ summary.nextSevenDays }}</strong></div><div class="stat"><span>Patients</span><strong>{{ summary.activePatients }}</strong></div><div class="stat"><span>Dentists</span><strong>{{ summary.activeDentists }}</strong></div><div class="stat"><span>Services</span><strong>{{ summary.activeServices }}</strong></div><div class="stat"><span>Pending notices</span><strong>{{ summary.pendingNotifications }}</strong></div>
      </div>

      <div class="admin-grid">
        <section class="panel"><span class="eyebrow">Catalogue</span><h2>Services</h2>
          <form [formGroup]="serviceForm" (ngSubmit)="saveService()" class="form-grid two tight">
            <label class="form-span">Service name<input formControlName="name"></label><label>Duration (minutes)<input type="number" formControlName="defaultDurationMinutes"></label><label>Starting price <span class="optional">optional</span><input type="number" formControlName="startingPrice" min="0" step="0.01"></label>
            <label>PayFast booking payment <span class="optional">optional</span><input type="number" formControlName="bookingPaymentAmount" min="5" step="0.01" placeholder="e.g. 250.00"><small class="field-help">Set the exact amount patients pay online to secure this service. Leave blank/0 to disable PayFast for this service.</small></label>
            <label class="form-span">Description<textarea rows="3" formControlName="description"></textarea></label><label class="check-row"><input type="checkbox" formControlName="isEmergencyService"> Emergency service</label><label>Display order<input type="number" formControlName="displayOrder"></label>
            <div class="form-span inline-actions"><button class="btn btn-primary" type="submit" [disabled]="serviceForm.invalid">{{ editingServiceId ? 'Update service' : 'Add service' }}</button><button *ngIf="editingServiceId" class="btn btn-secondary" type="button" (click)="cancelServiceEdit()">Cancel edit</button></div>
          </form>
          <div class="mini-list"><div *ngFor="let item of services"><span><strong>{{ item.name }}</strong><small>{{ item.defaultDurationMinutes }} min · PayFast: {{ item.bookingPaymentAmount ? (item.bookingPaymentAmount | currency:'ZAR':'symbol-narrow') : 'Not configured' }}</small></span><span class="inline-actions"><span class="pill" [class.neutral]="!item.isEmergencyService">{{ item.isEmergencyService ? 'Emergency' : 'Active' }}</span><button class="btn btn-ghost btn-small" type="button" (click)="editService(item)">Edit</button></span></div></div>
        </section>

        <section class="panel"><span class="eyebrow">Team</span><h2>Staff accounts</h2>
          <form [formGroup]="staffForm" (ngSubmit)="addStaff()" class="form-grid two tight">
            <label>First name<input formControlName="firstName"></label><label>Last name<input formControlName="lastName"></label><label>Email<input type="email" formControlName="email"></label><label>Phone<input formControlName="phoneNumber"></label>
            <label>Role<select formControlName="role"><option>Receptionist</option><option>Dentist</option><option>Administrator</option></select></label><label>Job title<input formControlName="jobTitle"></label><label class="form-span">Temporary password<input type="password" formControlName="temporaryPassword"></label>
            <button class="btn btn-primary form-span" type="submit" [disabled]="staffForm.invalid">Create staff account</button>
          </form>
          <div class="mini-list"><div *ngFor="let item of staff"><span><strong>{{ item.firstName }} {{ item.lastName }}</strong><small>{{ item.jobTitle }} · {{ item.email }}</small></span><span class="pill" [class.neutral]="!item.isActive">{{ item.isActive ? 'Active' : 'Inactive' }}</span></div></div>
        </section>
      </div>

      <section class="panel admin-section"><span class="eyebrow">Availability</span><h2>Dentist schedules</h2>
        <div class="schedule-admin">
          <div class="form-stack"><label>Dentist<select [formControl]="dentistSelector" (change)="loadAvailability()"><option [ngValue]="0">Select dentist</option><option *ngFor="let d of dentists" [ngValue]="d.dentistId">{{ d.name }}</option></select></label>
            <form [formGroup]="availabilityForm" (ngSubmit)="addAvailability()" class="form-grid two tight">
              <label>Day<select formControlName="dayOfWeek"><option [ngValue]="1">Monday</option><option [ngValue]="2">Tuesday</option><option [ngValue]="3">Wednesday</option><option [ngValue]="4">Thursday</option><option [ngValue]="5">Friday</option><option [ngValue]="6">Saturday</option><option [ngValue]="0">Sunday</option></select></label><label>Effective from<input type="date" formControlName="effectiveFrom"></label><label>Start<input type="time" formControlName="startTime"></label><label>End<input type="time" formControlName="endTime"></label><button class="btn btn-secondary form-span" type="submit" [disabled]="dentistSelector.value < 1 || availabilityForm.invalid">Add availability block</button>
            </form>
          </div>
          <div class="mini-list schedule-list"><div *ngFor="let item of availability"><span><strong>{{ dayName(item.dayOfWeek) }}</strong><small>{{ item.startTime }} – {{ item.endTime }} · from {{ item.effectiveFrom | date:'mediumDate' }}</small></span><button class="btn btn-danger btn-small" type="button" (click)="deleteAvailability(item)">Remove</button></div><div *ngIf="dentistSelector.value > 0 && availability.length === 0" class="empty-inline">No availability blocks configured.</div></div>
        </div>
      </section>

      <section class="panel admin-section"><span class="eyebrow">Accountability</span><h2>Recent audit activity</h2><div class="table-wrap"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>ID</th></tr></thead><tbody><tr *ngFor="let log of auditLogs"><td>{{ log.createdAtUtc | date:'medium' }}</td><td>{{ log.userEmail || 'System' }}</td><td><span class="pill neutral">{{ log.action }}</span></td><td>{{ log.entityType }}</td><td>{{ log.entityId || '—' }}</td></tr><tr *ngIf="auditLogs.length === 0"><td colspan="5"><div class="empty-inline">No audit entries yet.</div></td></tr></tbody></table></div></section>
    </section>
  `
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  summary?: AdminSummary; services: DentalService[] = []; staff: StaffItem[] = []; dentists: Dentist[] = []; availability: AvailabilityItem[] = []; auditLogs: AuditLog[] = []; error = ''; editingServiceId?: number;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly dentistSelector = this.fb.nonNullable.control(0);
  readonly serviceForm = this.fb.nonNullable.group({ name:['',Validators.required], description:[''], defaultDurationMinutes:[30,[Validators.required,Validators.min(15)]], startingPrice:[0], bookingPaymentAmount:[0], isEmergencyService:[false], displayOrder:[0] });
  readonly staffForm = this.fb.nonNullable.group({ firstName:['',Validators.required], lastName:['',Validators.required], email:['',[Validators.required,Validators.email]], phoneNumber:['',Validators.required], temporaryPassword:['',[Validators.required,Validators.minLength(8)]], role:['Receptionist',Validators.required], jobTitle:['Receptionist',Validators.required] });
  readonly availabilityForm = this.fb.nonNullable.group({ dayOfWeek:[1,Validators.required], startTime:['08:30',Validators.required], endTime:['17:00',Validators.required], effectiveFrom:[this.today,Validators.required] });

  ngOnInit(): void { this.refresh(); this.api.get<Dentist[]>('/dentists').subscribe(x => this.dentists = x); }
  refresh(): void { this.api.get<AdminSummary>('/admin/summary').subscribe(x => this.summary=x); this.api.get<DentalService[]>('/admin/services').subscribe(x=>this.services=x); this.api.get<StaffItem[]>('/admin/staff').subscribe(x=>this.staff=x); this.api.get<AuditLog[]>('/admin/audit-logs?take=100').subscribe(x=>this.auditLogs=x); }

  saveService(): void {
    if (this.serviceForm.invalid) return;
    const v=this.serviceForm.getRawValue(); this.error='';
    const payload={...v,startingPrice:v.startingPrice > 0 ? v.startingPrice : null,bookingPaymentAmount:v.bookingPaymentAmount >= 5 ? v.bookingPaymentAmount : null,isActive:true};
    const request = this.editingServiceId
      ? this.api.put(`/admin/services/${this.editingServiceId}`, payload)
      : this.api.post('/admin/services', payload);
    request.subscribe({next:()=>{this.cancelServiceEdit();this.refresh();},error:err=>this.error=errorMessage(err)});
  }
  editService(item: DentalService): void {
    this.editingServiceId=item.serviceId;
    this.serviceForm.setValue({name:item.name,description:item.description ?? '',defaultDurationMinutes:item.defaultDurationMinutes,startingPrice:item.startingPrice ?? 0,bookingPaymentAmount:item.bookingPaymentAmount ?? 0,isEmergencyService:item.isEmergencyService,displayOrder:item.displayOrder ?? 0});
  }
  cancelServiceEdit(): void {
    this.editingServiceId=undefined;
    this.serviceForm.reset({name:'',description:'',defaultDurationMinutes:30,startingPrice:0,bookingPaymentAmount:0,isEmergencyService:false,displayOrder:0});
  }
  addStaff(): void {
    if(this.staffForm.invalid)return; const v=this.staffForm.getRawValue(); this.error='';
    this.api.post('/admin/staff',{...v,staffNumber:null,professionalNumber:null,qualifications:v.role==='Dentist'?'BDS':null,bio:null}).subscribe({next:()=>{this.staffForm.reset({firstName:'',lastName:'',email:'',phoneNumber:'',temporaryPassword:'',role:'Receptionist',jobTitle:'Receptionist'});this.refresh();this.api.get<Dentist[]>('/dentists').subscribe(x=>this.dentists=x);},error:err=>this.error=errorMessage(err)});
  }
  loadAvailability(): void { const id=this.dentistSelector.value; this.availability=[]; if(id>0)this.api.get<AvailabilityItem[]>(`/admin/dentists/${id}/availability`).subscribe({next:x=>this.availability=x,error:err=>this.error=errorMessage(err)}); }
  addAvailability(): void { const id=this.dentistSelector.value;if(id<1||this.availabilityForm.invalid)return; const v=this.availabilityForm.getRawValue();this.api.post(`/admin/dentists/${id}/availability`,{...v,effectiveTo:null,isActive:true}).subscribe({next:()=>this.loadAvailability(),error:err=>this.error=errorMessage(err)}); }
  deleteAvailability(item:AvailabilityItem):void{if(!window.confirm('Remove this availability block?'))return;this.api.delete(`/admin/dentists/${item.dentistId}/availability/${item.dentistAvailabilityId}`).subscribe({next:()=>this.loadAvailability(),error:err=>this.error=errorMessage(err)});}
  dayName(day:number):string{return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day] ?? String(day);}
}
