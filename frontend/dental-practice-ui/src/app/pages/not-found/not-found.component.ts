import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ standalone:true, imports:[RouterLink], template:`<section class="auth-section"><div class="auth-card center"><span class="eyebrow">404</span><h1>Page not found</h1><p>The page you requested does not exist.</p><a routerLink="/" class="btn btn-primary">Return home</a></div></section>` })
export class NotFoundComponent {}
