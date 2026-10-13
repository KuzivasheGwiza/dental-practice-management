# Portal feature update

Existing databases need `database/upgrade-portal-v4.sql` after the profile and payment upgrades. New databases created with the current model already include these tables. Back up the existing database before deploying schema changes.

## New pages

- `/information`: dentist profiles, consultations, preparation, contact/directions, opening hours, FAQs, privacy and change policies.
- `/account/forgot`, `/account/reset`, `/account/verify`: account recovery and email verification.
- `/security`: verification links, authenticator enrollment and one-time recovery codes.
- `/receipt/:id`: patient-owned or receptionist/admin payment statement, printable using the browser's PDF option.
- `/staff`: day, week and month schedules, patient lookup, shared-availability rescheduling, and completed refund recording.
- `/admin/settings`: public content, contact details, practice hours, breaks/leave and notification status.
- `/reports`: receptionist/admin booking, cancellation, no-show, collections, refunds and outstanding booking-payment totals.

Patients can change bookings until the configurable deadline (24 hours by default). Staff can handle later changes. The same transactional booking service validates patient and reception bookings. Appointment times use South African local time; payment, email and audit timestamps use UTC.

## SMTP configuration

Email is disabled by default. In Development, messages are saved as JSON under `backend/DentalPractice.API/App_Data/DevelopmentInbox`. This is a private local test inbox; it contains account action links and must not be published. Disabled SMTP in Production leaves notifications queued and account email delivery unavailable.

Configure these values using environment variables or .NET user secrets, keeping passwords outside source control:

```text
Email__Enabled=true
Email__Host=your-smtp-host
Email__Port=587
Email__From=appointments@your-practice.example
Email__Username=your-smtp-username
Email__Password=your-smtp-password
Portal__FrontendBaseUrl=https://your-public-website.example
```

The SMTP account must support authenticated SMTP with STARTTLS. The delivery worker sends queued confirmations/change notices and creates reminders during the 24 hours before confirmed appointments. Failed deliveries remain pending and are retried. `Sent` means the SMTP server accepted the email, rather than proof that the recipient opened or received it. Run one delivery-worker instance; multi-instance deployment needs a distributed queue/claim mechanism. SMS and WhatsApp delivery are not configured.

For local user secrets, first run `dotnet user-secrets init` inside `backend/DentalPractice.API`, then set the values with `dotnet user-secrets set "Email:Host" "your-smtp-host"` (and the other corresponding `Email:` / `Portal:` keys). Enter the SMTP password locally, rather than pasting it into chat. Restart the API after changing configuration.

Verification is initiated from Security. Email verification status is displayed there. Phone verification requires an SMS provider and is not part of this SMTP integration.

## Staff MFA

Staff enroll an authenticator on `/security`, verify a six-digit code and save recovery codes privately. Enabling MFA invalidates existing sessions. Login accepts an authenticator code or a one-time recovery code. Password resets also invalidate old JWT sessions.

Production requires staff MFA by default. Until enrolled, authenticated staff can use only security/enrollment endpoints. Local Development permits staff accounts without MFA; set `Security__RequireStaffMfa=true` to exercise mandatory enrollment locally. Authentication endpoints have per-IP rate limits, in addition to account lockout protection. Store/persist ASP.NET Core Data Protection keys securely across production instances so email action links remain valid.

## Payments and refunds

Receipts list completed payments and a separate refund ledger. Refund recording requires a positive amount, a unique reference and an amount no greater than the unrefunded gross payment received. Staff must process the actual refund in PayFast or at reception first; this endpoint records that completed transaction. It does not send money. Reporting distinguishes gross collections from refunds, and outstanding amounts represent booking payments, not full treatment bills.

## Scope

This remains an in-person booking portal. Clinical intake documents, diagnoses, video consultations, telehealth consent/records, medical-aid claims and automated PayFast refunds need a separately specified clinical/provider workflow. The editable privacy notice is starter copy for practice review, not a claim of legal compliance.

## Backups

Run `powershell -File backup-database.ps1 -TestRestore` to create a SQL Server copy-only backup with checksums in the server's default backup directory, verify the backup and restore it to an isolated verification database. The test reads every restored user table. Add `-FullIntegrityCheck` to run full `DBCC CHECKDB`; this requires sufficient SQL Server query memory and has a 120-second timeout. The verification database is removed afterward; the backup is retained. The script never restores over the practice database. Restoring and reading tables does not replace a full integrity check. Back up profile-photo files separately, restrict access to backup files, and arrange scheduling, retention, offsite storage and recovery procedures for deployment.

Run `python tests/portal_smoke.py` from the project root to exercise the new API flows against a temporary isolated SQL database. It does not modify the practice database. It requires SQL Server, `sqlcmd`, Python and a successful backend build.
