import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { UserProfile } from '../../core/models';
import { ProfileImageService } from '../../core/profile-image.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-hero compact">
      <div class="shell dashboard-heading">
        <div><span class="eyebrow">My account</span><h1>Profile & account details</h1><p>Keep your personal details and profile picture up to date.</p></div>
      </div>
    </section>

    <section class="section shell profile-page">
      <div *ngIf="error" class="alert error">{{ error }}</div>
      <div *ngIf="success" class="alert success">{{ success }}</div>

      <div class="profile-layout" *ngIf="profile; else loadingProfile">
        <aside class="panel profile-photo-panel">
          <div class="profile-avatar large">
            <ng-container *ngIf="profileImages.imageUrl$ | async as photoUrl; else profileInitials"><img [src]="photoUrl" alt="Profile picture"></ng-container>
            <ng-template #profileInitials><span>{{ initials }}</span></ng-template>
          </div>
          <h2>{{ profile.firstName }} {{ profile.lastName }}</h2>
          <div class="role-row"><span class="pill neutral" *ngFor="let role of profile.roles">{{ role }}</span></div>
          <p class="muted">JPG, PNG or WebP. Maximum file size: 5 MB.</p>

          <label class="file-picker">
            <span>Choose profile picture</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" (change)="selectPhoto($event)">
          </label>
          <small class="selected-file" *ngIf="selectedPhoto">Selected: {{ selectedPhoto.name }}</small>
          <button class="btn btn-primary full" type="button" (click)="uploadPhoto()" [disabled]="!selectedPhoto || uploadingPhoto">
            {{ uploadingPhoto ? 'Uploading…' : 'Upload picture' }}
          </button>
          <button *ngIf="profile.hasProfileImage" class="btn btn-ghost full" type="button" (click)="removePhoto()" [disabled]="uploadingPhoto">Remove picture</button>
        </aside>

        <div class="panel">
          <span class="eyebrow">Personal details</span><h2>Edit your details</h2>
          <form [formGroup]="form" (ngSubmit)="save()" class="form-stack profile-form">
            <div class="form-grid two">
              <label>First name<input formControlName="firstName" maxlength="100"></label>
              <label>Last name<input formControlName="lastName" maxlength="100"></label>
              <label>Email address<input type="email" formControlName="email" maxlength="256"></label>
              <label>Phone number<input formControlName="phoneNumber" maxlength="30"></label>
            </div>

            <ng-container *ngIf="profile.patientId">
              <div class="form-divider"><strong>Patient contact details</strong></div>
              <div class="form-grid two">
                <label>Date of birth<input type="date" formControlName="dateOfBirth" [max]="today"></label>
                <label>Alternative phone <span class="optional">optional</span><input formControlName="alternativePhone" maxlength="30"></label>
                <label>Preferred contact method
                  <select formControlName="preferredContactMethod"><option>Email</option><option>SMS</option><option>WhatsApp</option><option>Phone</option></select>
                </label>
              </div>
            </ng-container>

            <ng-container *ngIf="profile.staffId">
              <div class="form-divider"><strong>Practice details</strong><span>Managed by the practice administrator</span></div>
              <div class="read-only-grid">
                <div><span>Job title</span><strong>{{ profile.jobTitle || '—' }}</strong></div>
                <div><span>Staff number</span><strong>{{ profile.staffNumber || '—' }}</strong></div>
              </div>
            </ng-container>

            <ng-container *ngIf="profile.dentistId">
              <div class="form-divider"><strong>Dentist professional profile</strong></div>
              <div class="form-grid two">
                <label>Professional number<input formControlName="professionalNumber" maxlength="100"></label>
                <label>Qualifications<input formControlName="qualifications" maxlength="500"></label>
                <label class="form-span">Professional biography<textarea rows="6" formControlName="bio" maxlength="3000"></textarea></label>
              </div>
            </ng-container>

            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving">{{ saving ? 'Saving…' : 'Save changes' }}</button>
              <button class="btn btn-ghost" type="button" (click)="resetForm()" [disabled]="saving">Reset</button>
            </div>
          </form>
        </div>
      </div>

      <ng-template #loadingProfile><div class="empty-state"><strong>Loading profile…</strong></div></ng-template>
    </section>
  `
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly profileImages = inject(ProfileImageService);

  profile?: UserProfile;
  selectedPhoto?: File;
  error = '';
  success = '';
  saving = false;
  uploadingPhoto = false;
  readonly today = new Date().toISOString().slice(0, 10);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    alternativePhone: [''],
    dateOfBirth: [''],
    preferredContactMethod: ['Email'],
    professionalNumber: [''],
    qualifications: [''],
    bio: ['']
  });

  get initials(): string {
    const first = this.profile?.firstName?.trim()?.[0] ?? '';
    const last = this.profile?.lastName?.trim()?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }

  ngOnInit(): void { this.loadProfile(); }


  save(): void {
    if (!this.profile || this.form.invalid) return;
    this.error = ''; this.success = ''; this.saving = true;
    const v = this.form.getRawValue();
    this.api.put<UserProfile>('/profile', {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phoneNumber: v.phoneNumber,
      alternativePhone: v.alternativePhone || null,
      dateOfBirth: v.dateOfBirth || null,
      preferredContactMethod: v.preferredContactMethod || null,
      professionalNumber: v.professionalNumber || null,
      qualifications: v.qualifications || null,
      bio: v.bio || null
    }).subscribe({
      next: profile => {
        this.saving = false;
        this.profile = profile;
        this.patchForm(profile);
        this.auth.updateLocalProfile(profile.email, `${profile.firstName} ${profile.lastName}`.trim());
        this.success = 'Your profile details were updated successfully.';
      },
      error: err => { this.saving = false; this.error = errorMessage(err, 'Could not update your profile.'); }
    });
  }

  resetForm(): void { if (this.profile) this.patchForm(this.profile); }

  selectPhoto(event: Event): void {
    this.error = ''; this.success = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { this.selectedPhoto = undefined; return; }
    if (file.size > 5 * 1024 * 1024) {
      this.selectedPhoto = undefined;
      this.error = 'Profile pictures must be 5 MB or smaller.';
      input.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.selectedPhoto = undefined;
      this.error = 'Choose a JPG, PNG or WebP image.';
      input.value = '';
      return;
    }
    this.selectedPhoto = file;
  }

  uploadPhoto(): void {
    if (!this.selectedPhoto) return;
    this.error = ''; this.success = ''; this.uploadingPhoto = true;
    const data = new FormData();
    data.append('file', this.selectedPhoto);
    this.api.post<UserProfile>('/profile/photo', data).subscribe({
      next: profile => {
        this.uploadingPhoto = false;
        this.selectedPhoto = undefined;
        this.profile = profile;
        this.profileImages.load();
        this.success = 'Profile picture uploaded successfully.';
      },
      error: err => { this.uploadingPhoto = false; this.error = errorMessage(err, 'Could not upload the profile picture.'); }
    });
  }

  removePhoto(): void {
    if (!window.confirm('Remove your current profile picture?')) return;
    this.error = ''; this.success = ''; this.uploadingPhoto = true;
    this.api.delete<UserProfile>('/profile/photo').subscribe({
      next: profile => {
        this.uploadingPhoto = false;
        this.profile = profile;
        this.selectedPhoto = undefined;
        this.profileImages.clear();
        this.success = 'Profile picture removed.';
      },
      error: err => { this.uploadingPhoto = false; this.error = errorMessage(err, 'Could not remove the profile picture.'); }
    });
  }

  private loadProfile(): void {
    this.error = '';
    this.api.get<UserProfile>('/profile').subscribe({
      next: profile => {
        this.profile = profile;
        this.patchForm(profile);
        if (profile.hasProfileImage) this.profileImages.load(); else this.profileImages.clear();
      },
      error: err => this.error = errorMessage(err, 'Could not load your profile.')
    });
  }

  private patchForm(profile: UserProfile): void {
    this.form.reset({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      alternativePhone: profile.alternativePhone ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      preferredContactMethod: profile.preferredContactMethod ?? 'Email',
      professionalNumber: profile.professionalNumber ?? '',
      qualifications: profile.qualifications ?? '',
      bio: profile.bio ?? ''
    });
  }
}
