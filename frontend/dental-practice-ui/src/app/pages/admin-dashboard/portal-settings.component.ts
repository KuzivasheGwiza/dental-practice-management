import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Dentist, Practice } from '../../core/models';
import { PortalContent } from '../information/information.component';
import { errorMessage } from '../../core/http-error';

interface Block {availabilityExceptionId:number;startDateTime:string;endDateTime:string;reason:string;}
@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="page-hero compact"><div class="shell"><h1>Website and practice settings</h1><p>Publish visit information and manage time away from appointments.</p></div></section>
<section class="section shell"><div *ngIf="error" class="alert error">{{error}}</div><div *ngIf="message" class="alert">{{message}}</div>
<div class="admin-grid"><form class="panel form-stack" *ngIf="content" (ngSubmit)="saveContent()" #contentForm="ngForm"><h2>Website content</h2>
<label>Consultation information<textarea name="consultation" rows="4" [(ngModel)]="content.consultationInformation" required></textarea></label>
<label>Preparation instructions<textarea name="preparation" rows="3" [(ngModel)]="content.preparationInstructions" required></textarea></label>
<label>Cancellation and refund policy<textarea name="policy" rows="3" [(ngModel)]="content.cancellationPolicy" required></textarea></label>
<label>Online change deadline (hours)<input name="deadline" type="number" min="0" max="168" [(ngModel)]="content.changeDeadlineHours" required></label>
<label>Frequently asked questions<textarea name="faqs" rows="6" [(ngModel)]="content.faqs" required></textarea></label>
<label>Privacy notice<textarea name="privacy" rows="6" [(ngModel)]="content.privacyNotice" required></textarea></label><button class="btn btn-primary" [disabled]="contentForm.invalid || busy">Publish content</button></form>
<form class="panel form-stack" *ngIf="contact" (ngSubmit)="saveContact()" #contactForm="ngForm"><h2>Practice contact details</h2>
<label>Name<input name="name" [(ngModel)]="contact.name" required></label><label>Email<input name="email" type="email" [(ngModel)]="contact.email" required email></label><label>Phone<input name="phone" [(ngModel)]="contact.phone" required></label>
<label>Street address<input name="address" [(ngModel)]="contact.addressLine1" required></label><label>City<input name="city" [(ngModel)]="contact.city" required></label><label>Province<input name="province" [(ngModel)]="contact.province" required></label><label>Postal code<input name="postal" [(ngModel)]="contact.postalCode"></label><button class="btn btn-primary" [disabled]="contactForm.invalid || busy">Save contact details</button>
<h2>Opening hours</h2><p *ngFor="let hour of hours">{{hour.day}}: {{hour.isClosed ? 'Closed' : hour.openingTime + ' – ' + hour.closingTime}}</p>
</form></div>
<section class="panel admin-section"><h2>Breaks, leave and blocked dates</h2><div class="form-stack"><label>Dentist<select [(ngModel)]="dentistId" (change)="loadBlocks()"><option [ngValue]="0">Select dentist</option><option *ngFor="let d of dentists" [ngValue]="d.dentistId">{{d.name}}</option></select></label>
<form (ngSubmit)="addBlock()" #blockForm="ngForm" class="form-grid two"><label>Start<input name="start" type="datetime-local" [(ngModel)]="block.startDateTime" required></label><label>End<input name="end" type="datetime-local" [(ngModel)]="block.endDateTime" required></label><label>Reason<input name="reason" [(ngModel)]="block.reason" required></label><label>Type<select name="type" [(ngModel)]="block.exceptionType"><option>Leave</option><option>Break</option><option>Blocked</option></select></label><button class="btn btn-primary" [disabled]="!dentistId || blockForm.invalid || busy">Block availability</button></form></div>
<div class="mini-list"><div *ngFor="let b of blocks"><span>{{b.startDateTime | date:'medium'}} – {{b.endDateTime | date:'medium'}}<small>{{b.reason}}</small></span><button class="btn btn-danger btn-small" (click)="removeBlock(b)">Remove</button></div></div></section>
<section class="panel admin-section"><h2>Notification delivery</h2><p>DevelopmentInbox means the email was saved locally. Sent means SMTP accepted it. Pending emails are retried by the delivery worker.</p><div class="table-wrap"><table><thead><tr><th>Type</th><th>Status</th><th>Created</th></tr></thead><tbody><tr *ngFor="let n of notices"><td>{{n.notificationType}}</td><td>{{n.status}}</td><td>{{n.createdAtUtc | date:'medium'}}</td></tr></tbody></table></div></section>
</section>`})
export class PortalSettingsComponent implements OnInit {
 private readonly api=inject(ApiService);content?:PortalContent;contact?:{name:string;email:string;phone:string;addressLine1:string;city:string;province:string;postalCode:string};hours:Practice['hours']=[];dentists:Dentist[]=[];dentistId=0;blocks:Block[]=[];notices:{notificationType:string;status:string;createdAtUtc:string}[]=[];error='';message='';busy=false;
 block={startDateTime:'',endDateTime:'',reason:'',exceptionType:'Leave'};
 ngOnInit():void {this.api.get<PortalContent>('/portal/content').subscribe({next:x=>this.content=x,error:e=>this.fail(e)});this.api.get<Practice>('/practice').subscribe({next:x=>{this.contact={name:x.name,email:x.email??'',phone:x.phone??'',addressLine1:x.addressLine1??'',city:x.city??'',province:x.province??'',postalCode:x.postalCode??''};this.hours=x.hours;},error:e=>this.fail(e)});this.api.get<Dentist[]>('/dentists').subscribe(x=>this.dentists=x);this.api.get<typeof this.notices>('/portal/notifications').subscribe({next:x=>this.notices=x,error:e=>this.fail(e)});}
 fail(e:unknown):void{this.error=errorMessage(e);this.busy=false;}
 saveContent():void{this.busy=true;this.error='';this.api.put('/portal/content',this.content).subscribe({next:()=>{this.busy=false;this.message='Website content published.';},error:e=>this.fail(e)});}
 saveContact():void{this.busy=true;this.error='';this.api.put('/portal/contact',this.contact).subscribe({next:()=>{this.busy=false;this.message='Contact details saved.';},error:e=>this.fail(e)});}
 saveHours():void{const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];this.busy=true;this.api.put('/portal/hours',this.hours.map(h=>({dayOfWeek:typeof h.day==='number'?h.day:days.indexOf(h.day),openingTime:h.isClosed?null:(h.openingTime?.length===5?h.openingTime+':00':h.openingTime),closingTime:h.isClosed?null:(h.closingTime?.length===5?h.closingTime+':00':h.closingTime),isClosed:h.isClosed}))).subscribe({next:()=>{this.busy=false;this.message='Opening hours saved.';},error:e=>this.fail(e)});}
 loadBlocks():void{this.blocks=[];if(this.dentistId)this.api.get<Block[]>(`/admin/dentists/${this.dentistId}/exceptions`).subscribe({next:x=>this.blocks=x,error:e=>this.fail(e)});}
 addBlock():void{this.busy=true;this.error='';this.api.post(`/admin/dentists/${this.dentistId}/exceptions`,this.block).subscribe({next:()=>{this.busy=false;this.loadBlocks();},error:e=>this.fail(e)});}
 removeBlock(b:Block):void{if(!confirm('Remove this blocked period?'))return;this.api.delete(`/admin/dentists/${this.dentistId}/exceptions/${b.availabilityExceptionId}`).subscribe({next:()=>this.loadBlocks(),error:e=>this.fail(e)});}
}
