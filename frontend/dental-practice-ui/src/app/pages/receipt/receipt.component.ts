import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';
interface Receipt { bookingReference:string;patientName:string;serviceName:string;startDateTime:string;amountPaid:number;amountDueAtBooking:number;payments:{receiptNumber:string;amount:number;currency:string;paymentMethod:string;paidAtUtc:string}[];refunds:{amount:number;reason:string;externalReference:string;createdAtUtc:string}[]; }
@Component({standalone:true,imports:[CommonModule],template:`
<section class="section shell"><div class="panel receipt"><h1>Payment statement</h1><div *ngIf="error" class="alert error">{{error}}</div>
<ng-container *ngIf="receipt as r"><h2>{{r.bookingReference}}</h2><p>{{r.patientName}} · {{r.serviceName}}</p><p>Appointment: {{r.startDateTime | date:'medium'}}</p>
<p>Booking payment due: {{r.amountDueAtBooking | currency:'ZAR':'symbol-narrow'}} · Gross received: {{r.amountPaid | currency:'ZAR':'symbol-narrow'}}</p>
<h2>Receipts</h2><article *ngFor="let payment of r.payments"><p>{{payment.receiptNumber}}</p><strong>{{payment.amount | currency:'ZAR':'symbol-narrow'}}</strong><p>{{payment.paymentMethod}} · {{payment.paidAtUtc | date:'medium'}}</p></article><p *ngIf="!r.payments.length">No completed payments have been recorded.</p>
<h2 *ngIf="r.refunds.length">Refunds</h2><p *ngFor="let refund of r.refunds">{{refund.amount | currency:'ZAR':'symbol-narrow'}} · {{refund.reason}} · {{refund.externalReference}} · {{refund.createdAtUtc | date:'medium'}}</p>
<button class="btn btn-primary no-print" (click)="print()">Print / save as PDF</button></ng-container></div></section>`})
export class ReceiptComponent implements OnInit {private readonly api=inject(ApiService);private readonly route=inject(ActivatedRoute);receipt?:Receipt;error='';ngOnInit():void{this.api.get<Receipt>(`/portal/receipts/${this.route.snapshot.paramMap.get('id')}`).subscribe({next:x=>this.receipt=x,error:e=>this.error=errorMessage(e)});}print():void{window.print();}}
