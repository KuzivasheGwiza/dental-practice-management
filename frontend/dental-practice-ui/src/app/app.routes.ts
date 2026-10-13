import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
import { HomeComponent } from './pages/home/home.component';
import { ServicesComponent } from './pages/services/services.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { BookComponent } from './pages/book/book.component';
import { PatientDashboardComponent } from './pages/patient-dashboard/patient-dashboard.component';
import { StaffDashboardComponent } from './pages/staff-dashboard/staff-dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PayFastReturnComponent } from './pages/payfast-return/payfast-return.component';
import { PayFastCancelComponent } from './pages/payfast-cancel/payfast-cancel.component';

import { AccountComponent } from './pages/account/account.component';
import { SecurityComponent } from './pages/account/security.component';
import { InformationComponent } from './pages/information/information.component';
import { ReceiptComponent } from './pages/receipt/receipt.component';
import { PortalSettingsComponent } from './pages/admin-dashboard/portal-settings.component';
import { ReportsComponent } from './pages/admin-dashboard/reports.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Dental Practice' },
  { path: 'services', component: ServicesComponent, title: 'Services' },
  { path: 'login', component: LoginComponent, title: 'Patient Login' },
  { path: 'register', component: RegisterComponent, title: 'Create Account' },
  { path: 'book', component: BookComponent, canActivate: [roleGuard(['Patient'])], title: 'Book Appointment' },
  { path: 'patient', component: PatientDashboardComponent, canActivate: [roleGuard(['Patient'])], title: 'My Appointments' },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'My Profile' },
  { path: 'payment/payfast/return', component: PayFastReturnComponent, canActivate: [roleGuard(['Patient'])], title: 'PayFast Payment' },
  { path: 'payment/payfast/cancel', component: PayFastCancelComponent, canActivate: [roleGuard(['Patient'])], title: 'PayFast Cancelled' },
  { path: 'staff', component: StaffDashboardComponent, canActivate: [roleGuard(['Receptionist', 'Dentist', 'Administrator'])], title: 'Staff Dashboard' },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [roleGuard(['Administrator'])], title: 'Administration' },
  { path: 'information', component: InformationComponent, title: 'Plan your visit' },
  { path: 'account/forgot', component: AccountComponent, data: {mode:'forgot'}, title: 'Forgot password' },
  { path: 'account/reset', component: AccountComponent, data: {mode:'reset'}, title: 'Reset password' },
  { path: 'account/verify', component: AccountComponent, data: {mode:'verify'}, title: 'Verify email' },
  { path: 'security', component: SecurityComponent, canActivate: [authGuard], title: 'Account security' },
  { path: 'receipt/:id', component: ReceiptComponent, canActivate: [authGuard], title: 'Payment statement' },
  { path: 'admin/settings', component: PortalSettingsComponent, canActivate: [roleGuard(['Administrator'])], title: 'Website settings' },
  { path: 'reports', component: ReportsComponent, canActivate: [roleGuard(['Administrator','Receptionist'])], title: 'Practice reports' },
  { path: '**', component: NotFoundComponent, title: 'Page Not Found' }
];
