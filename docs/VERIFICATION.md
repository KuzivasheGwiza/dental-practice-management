# Verification report

Local review performed on **13 October 2026 (Africa/Johannesburg)**. These results describe the checked project snapshot; GitHub Actions provides checks for subsequent commits.

## Functional and build checks

| Check | Result | Coverage |
| --- | --- | --- |
| React production build | Passed | TypeScript compilation and Vite bundle |
| React lint | Passed | Oxlint |
| React unit tests | 9 passed | Booking rules, conflicts, reservation expiry, payment retry and service authorization |
| React browser tests | 11 passed | Patient/staff journeys, payments, administration and responsive navigation at 390, 768 and 1440 px |
| Accessibility | Passed within browser suite | Axe scans on home, services, login and patient dashboard; cancellation-dialog keyboard behavior |
| Angular production build | Passed | Application bundle and configured size budgets |
| API Release build | Passed | No compiler warnings or errors |
| API integration smoke test | Passed | MFA, recovery, session invalidation, patient ownership, concurrent booking, deadlines, refunds and notification delivery |
| Backup verification | Passed within API smoke test | Backup checksums, isolated restore and restored-table reads |

The SQL smoke test creates an isolated database and removes it afterward. The backup check does not replace a full database integrity check. Browser tests use Chromium; Firefox, Safari and physical-device testing are not covered by this run. Automated accessibility checks cover selected pages, not a complete accessibility certification.

## Dependency review

The initial NuGet scan found advisories in transitive dependencies. ASP.NET Core and EF Core package references were updated from 8.0.8 to 8.0.31; a subsequent `dotnet list package --vulnerable --include-transitive` reported no vulnerable packages from the configured feeds.

The React `npm audit` reported no vulnerabilities, including development dependencies. Angular's initial production dependency audit was clear, but its full audit reported 11 development-tool findings. The application builder was changed from `@angular-devkit/build-angular` to `@angular/build` 20.3.39 to remove unused webpack tooling. Its final production build passed with the same bundle output, and its full `npm audit` reported zero vulnerabilities.

Audit results depend on the advisory databases at the time of the scan and are not proof that a system has no security defects.

## Repository preparation

- Replaced the root README with demo setup, screenshots, architecture, full-stack instructions and accurate feature boundaries.
- Added GitHub Actions for both frontend builds, React lint/unit/browser tests and the API Release build. Hosted runs have not occurred yet.
- Updated security documentation to reflect existing recovery, verification, MFA and rate limiting.
- Used `npm ci` in the full-stack setup helper for lockfile-based installation.
- Removed Docker's fallback database password; local configuration is now required.
- Expanded exclusions for test output, database backups, caches and private key containers. Existing exclusions cover local environment files, uploads and the development email inbox.
- Checked root README links: all referenced local files exist.
- Scanned 166 source/configuration/documentation files for recognizable private-key, GitHub-token and AWS-access-key patterns: no matches. This limited pattern scan does not replace manual credential review or GitHub secret scanning.

## Remaining boundaries

The React app remains a browser-side demonstration. No deployed URL, real email delivery, live PayFast transaction, penetration test or complete production-readiness review is claimed. The full-stack application still uses `EnsureCreatedAsync()` plus SQL upgrade scripts rather than EF migrations. Those limitations are documented in the root README and deployment checklist.
