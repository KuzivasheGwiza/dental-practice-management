# Production deployment checklist

## Configuration

- [ ] Production practice name/contact/address/logo configured
- [ ] Demo dentist data removed
- [ ] Demo staff accounts removed
- [ ] Strong JWT secret configured through hosting secret storage
- [ ] Production SQL connection string stored securely
- [ ] Production Angular API URL configured
- [ ] Production CORS set to the exact website origin

## Database

- [ ] Move from `EnsureCreatedAsync()` to EF Core migrations
- [ ] Create least-privilege application database login
- [ ] Automated backups enabled
- [ ] Backup restore tested
- [ ] Database access restricted from the public internet where possible

## Authentication

- [ ] Email verification delivery tested through production SMTP
- [ ] Password reset and token expiry tested with persisted Data Protection keys
- [ ] Lockout/rate limiting tested
- [ ] Development credentials removed
- [ ] HTTPS required

## Notifications

- [ ] Transactional email provider connected
- [ ] Booking confirmation template approved
- [ ] Reschedule/cancellation templates approved
- [ ] Reminder schedule approved
- [ ] WhatsApp/SMS integration only after provider/legal requirements are satisfied

## Privacy and operations

- [ ] Privacy notice published
- [ ] Data retention rules agreed
- [ ] User permissions reviewed
- [ ] Audit log retention agreed
- [ ] Incident response contact identified
- [ ] Staff trained on account/access handling

## Testing

- [ ] Functional test plan passed
- [ ] Cross-browser testing passed
- [ ] Mobile responsive testing passed
- [ ] Concurrent booking test passed
- [ ] Security review completed
- [ ] Client UAT and sign-off completed

## User profile storage

- For an existing database, run `database/upgrade-profile-v2.sql`.
- Give the API process write permission to `App_Data/ProfilePictures` and no broader write permission than required.
- Include `App_Data/ProfilePictures` in encrypted backup and restore tests.
- Do not expose `App_Data` directly through the web server.
- Confirm the production JWT signing key is not the repository placeholder; the API now refuses to start in Production with the placeholder key.
- Confirm demo users are not enabled in Production unless `SeedData:EnableDemoUsers=true` was intentionally set for a non-live environment.
