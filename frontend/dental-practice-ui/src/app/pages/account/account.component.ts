import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/http-error';

@Component({standalone:true, imports:[CommonModule,FormsModule,RouterLink], template:`
  <section class="auth-section"><div class="auth-card">
    <h1>{{ mode === 'reset' ? 'Reset password' : mode === 'verify' ? 'Verify email' : 'Forgot password' }}</h1>
    <div *ngIf="message" class="alert">{{ message }}</div><div *ngIf="error" class="alert error">{{ error }}</div>
    <form (ngSubmit)="submit()" class="form-stack" #form="ngForm">
      <label>Email<input name="email" type="email" [(ngModel)]="email" required email [readOnly]="mode === 'verify'"></label>
      <label *ngIf="mode === 'reset'">New password<input name="password" type="password" [(ngModel)]="password" minlength="8" required autocomplete="new-password"><small>Use at least 8 characters with uppercase, lowercase, a number and a symbol.</small></label>
      <button class="btn btn-primary" [disabled]="form.invalid || busy || done">{{ mode === 'verify' ? 'Verify email' : mode === 'reset' ? 'Change password' : 'Send reset link' }}</button>
    </form><p><a routerLink="/login">Back to login</a></p>
  </div></section>`})
export class AccountComponent {
  private readonly api=inject(ApiService); private readonly route=inject(ActivatedRoute);
  mode=this.route.snapshot.data['mode'] as string;
  email=this.route.snapshot.queryParamMap.get('email') ?? ''; token=this.route.snapshot.queryParamMap.get('token') ?? '';
  password=''; message=''; error=''; busy=false; done=false;
  submit():void {
    this.busy=true; this.error='';
    if(this.mode !== 'forgot' && !this.token) { this.error='Open the link from your email to continue.'; this.busy=false; return; }
    const path=this.mode==='forgot'?'forgot-password':this.mode==='reset'?'reset-password':'verify-email';
    this.api.post<{message:string}>(`/auth/${path}`,{email:this.email,token:this.token,password:this.password}).subscribe({next:x=>{this.message=x.message;this.busy=false;this.done=true;},error:e=>{this.error=errorMessage(e);this.busy=false;}});
  }
}
