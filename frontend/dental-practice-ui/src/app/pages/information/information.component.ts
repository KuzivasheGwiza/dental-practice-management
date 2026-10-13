import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Dentist, Practice } from '../../core/models';
import { errorMessage } from '../../core/http-error';

export interface PortalContent { consultationInformation:string; preparationInstructions:string; cancellationPolicy:string; privacyNotice:string; faqs:string; changeDeadlineHours:number; }
@Component({standalone:true,imports:[CommonModule,RouterLink],template:`
<section class="page-hero compact"><div class="shell"><h1>Plan your visit</h1><p>Meet the team and find the information you need before booking.</p><a routerLink="/book" class="btn btn-primary">Book a consultation</a></div></section>
<section class="section shell"><div *ngIf="error" class="alert error">{{error}}</div>
<div class="card-grid three"><article class="panel" *ngFor="let doctor of doctors"><h2>{{doctor.name}}</h2><p>{{doctor.qualifications}}</p><p>{{doctor.bio}}</p><small *ngIf="doctor.professionalNumber">Professional registration: {{doctor.professionalNumber}}</small></article></div>
<div class="admin-grid" *ngIf="content"><article class="panel"><h2>Consultations</h2><p class="preserve-lines">{{content.consultationInformation}}</p><h3>Preparation</h3><p class="preserve-lines">{{content.preparationInstructions}}</p></article>
<article class="panel" *ngIf="practice"><h2>Contact and directions</h2><p>{{practice.name}}</p><p>{{practice.addressLine1}} {{practice.addressLine2}}<br>{{practice.city}} {{practice.province}} {{practice.postalCode}}</p>
<p><a [href]="'tel:'+practice.phone">{{practice.phone}}</a></p><p><a [href]="'mailto:'+practice.email">{{practice.email}}</a></p><a [href]="directions" target="_blank" rel="noopener">Open map and directions</a>
<p *ngFor="let hour of practice.hours">{{hour.day}}: {{hour.isClosed ? 'Closed' : hour.openingTime + ' – ' + hour.closingTime}}</p></article></div>
<article class="panel admin-section" *ngIf="content"><h2>Booking changes and refunds</h2><p>Online changes are available until {{content.changeDeadlineHours}} hours before your appointment. Contact reception for later changes.</p><p class="preserve-lines">{{content.cancellationPolicy}}</p><h2>Frequently asked questions</h2><p class="preserve-lines">{{content.faqs}}</p><h2>Privacy notice</h2><p class="preserve-lines">{{content.privacyNotice}}</p></article>
</section>`})
export class InformationComponent implements OnInit {
 private readonly api=inject(ApiService); content?:PortalContent;practice?:Practice;doctors:Dentist[]=[];error='';
 get directions():string {return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([this.practice?.addressLine1,this.practice?.city,this.practice?.province].filter(Boolean).join(', '));}
 ngOnInit():void {this.api.get<PortalContent>('/portal/content').subscribe({next:x=>this.content=x,error:e=>this.error=errorMessage(e)});this.api.get<Practice>('/practice').subscribe({next:x=>this.practice=x,error:e=>this.error=errorMessage(e)});this.api.get<Dentist[]>('/dentists').subscribe({next:x=>this.doctors=x,error:e=>this.error=errorMessage(e)});}
}
