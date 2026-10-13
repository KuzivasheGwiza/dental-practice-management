import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';
import { AuthService } from '../../core/auth.service';
import { AuthResponse } from '../../core/models';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<section class="section shell"><div class="panel"><h1>Account security</h1>
<div *ngIf="error" class="alert error">{{error}}</div><div *ngIf="message" class="alert">{{message}}</div>
<p>Email: {{status?.emailConfirmed ? 'Verified' : 'Not verified'}}</p>
<button *ngIf="status && !status.emailConfirmed" class="btn btn-secondary" (click)="verify()" [disabled]="busy">Send verification link</button>
<h2>Authenticator app</h2><p>Add a second sign-in step to protect your account. Staff should enable this before using the practice portal.</p>
<p *ngIf="status?.twoFactorEnabled">Authenticator protection is enabled.</p>
<button *ngIf="status && !status.twoFactorEnabled && !key" class="btn btn-primary" (click)="setup()" [disabled]="busy">Set up authenticator</button>
<div *ngIf="key" class="form-stack"><p>In your authenticator app, add a time-based account named Dental Practice using this secret:</p><code>{{key}}</code>
<p>Keep this secret private. Enter the six-digit code from the app to finish.</p><label>Authenticator code<input [(ngModel)]="code" autocomplete="one-time-code" inputmode="numeric"></label>
<button class="btn btn-primary" (click)="enable()" [disabled]="busy || code.length < 6">Enable protection</button></div>
<div *ngIf="recoveryCodes.length"><h2>Save these recovery codes</h2><p>Each code can be used once if you lose access to your authenticator. Store them privately.</p><pre>{{recoveryCodes.join('\n')}}</pre><a routerLink="/login" class="btn btn-primary">Sign in again</a></div>
</div></section>`})
export class SecurityComponent implements OnInit {
 private readonly api=inject(ApiService); private readonly auth=inject(AuthService); status?:{emailConfirmed:boolean;twoFactorEnabled:boolean}; key='';code='';error='';message='';busy=false;recoveryCodes:string[]=[];
 ngOnInit():void {this.api.get<{emailConfirmed:boolean;twoFactorEnabled:boolean}>('/auth/security').subscribe({next:x=>this.status=x,error:e=>this.error=errorMessage(e)});}
 verify():void {this.busy=true;this.api.post<{message:string}>('/auth/send-verification',{}).subscribe({next:x=>{this.message=x.message;this.busy=false;},error:e=>{this.error=errorMessage(e);this.busy=false;}});}
 setup():void {this.busy=true;this.api.post<{key:string;session:AuthResponse}>('/auth/mfa/setup',{}).subscribe({next:x=>{this.auth.updateSession(x.session);this.key=x.key;this.busy=false;},error:e=>{this.error=errorMessage(e);this.busy=false;}});}
 enable():void {this.busy=true;this.api.post<{message:string;recoveryCodes:string[]}>('/auth/mfa/enable',{code:this.code}).subscribe({next:x=>{this.message=x.message;this.recoveryCodes=x.recoveryCodes;this.key='';this.status={emailConfirmed:this.status?.emailConfirmed??false,twoFactorEnabled:true};this.busy=false;localStorage.removeItem('dental_auth');},error:e=>{this.error=errorMessage(e);this.busy=false;}});}
}
