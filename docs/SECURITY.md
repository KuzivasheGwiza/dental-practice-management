# Security notes

## Included controls

- ASP.NET Core Identity password hashing
- Unique account email addresses
- Password complexity configuration
- JWT bearer authentication
- Role-based authorization
- Patient ownership checks on patient appointment routes
- Active/inactive user flag
- Audit logging for important actions
- Server-side booking validation
- Serializable transaction for booking/rescheduling
- Parameterized database access through EF Core
- CORS limited to the local Angular origin in the current development configuration
- Generic 500 responses from exception middleware
- Account recovery and email-verification endpoints
- Authenticator MFA with recovery codes and production staff enrollment requirement
- Per-IP authentication rate limits and temporary account lockout
- Security-stamp validation to invalidate sessions after security changes

## Data boundary for Version 1

The starter system is designed around appointment administration and non-clinical profile information.

Do not start storing clinical or highly sensitive dental records merely by adding fields to these tables. A clinical-record module requires a deliberate security/privacy design covering access rules, retention, consent, logging, backup, breach response and applicable legal requirements.

## Before live patient use

1. Generate a strong JWT signing secret and store it outside the repository.
2. Remove demo credentials.
3. Enforce HTTPS.
4. Configure and verify email confirmation delivery through SMTP.
5. Test account recovery, token expiry and Data Protection key persistence in the target environment.
6. Monitor authentication rate limits and account lockout events.
7. Review session/token expiry policy.
8. Use least-privilege database credentials.
9. Encrypt backups and control backup access.
10. Configure centralized security/error monitoring.
11. Review POPIA/privacy obligations with the practice or qualified adviser.
12. Define a privacy notice and data-retention policy.
13. Perform penetration/security testing before launch.
14. Configure production CORS to the exact production domain only.
15. Do not place email, WhatsApp, SMS, database or hosting secrets in source control.

## Profile pictures

Profile pictures are treated as authenticated account data rather than public website assets. Files are written to `App_Data/ProfilePictures`, outside `wwwroot`, and are served through an authenticated API endpoint. The upload endpoint limits file size to 5 MB, permits only JPG/PNG/WebP, checks the binary signature, generates the server-side filename, and never trusts the uploaded filename for storage.

Production backup procedures must include this directory. Consider malware scanning and image re-encoding if the deployment's risk assessment requires a stronger upload pipeline.

## Login lockout

Identity lockout is enabled for newly created accounts. Failed sign-in attempts are counted and the configured temporary lockout is now enforced. Existing databases should run `database/upgrade-profile-v2.sql` so older accounts also have lockout enabled.
