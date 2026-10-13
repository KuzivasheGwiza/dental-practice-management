import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';
interface Report {bookings:number;cancellations:number;noShows:number;collected:number;refunded:number;outstandingBookingPayments:number;}
@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="section shell"><h1>Practice reports</h1><div *ngIf="error" class="alert error">{{error}}</div><form class="panel form-grid two" (ngSubmit)="load()"><label>From<input type="date" name="from" [(ngModel)]="from" required></label><label>To<input type="date" name="to" [(ngModel)]="to" required></label><button class="btn btn-primary" [disabled]="busy">View report</button></form>
<div class="stat-grid three admin-section" *ngIf="report as r"><div class="stat"><span>Bookings</span><strong>{{r.bookings}}</strong></div><div class="stat"><span>Cancellations</span><strong>{{r.cancellations}}</strong></div><div class="stat"><span>No-shows</span><strong>{{r.noShows}}</strong></div><div class="stat"><span>Collected</span><strong>{{r.collected | currency:'ZAR':'symbol-narrow'}}</strong></div><div class="stat"><span>Refunded</span><strong>{{r.refunded | currency:'ZAR':'symbol-narrow'}}</strong></div><div class="stat"><span>Outstanding booking payments</span><strong>{{r.outstandingBookingPayments | currency:'ZAR':'symbol-narrow'}}</strong></div></div>
<p>Booking counts use appointment dates. Collections and refunds use transaction dates in South African time. Outstanding amounts cover booking payments; treatment balances are not included.</p></section>`})
export class ReportsComponent implements OnInit {private readonly api=inject(ApiService);from=new Date().toLocaleDateString('en-CA');to=this.from;report?:Report;error='';busy=false;ngOnInit():void{this.load();}load():void{this.busy=true;this.error='';this.api.get<Report>(`/portal/reports?from=${this.from}&to=${this.to}`).subscribe({next:x=>{this.report=x;this.busy=false;},error:e=>{this.error=errorMessage(e);this.busy=false;}});}}
