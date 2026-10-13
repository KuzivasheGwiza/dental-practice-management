# DentalCare React demonstration

A complete React + TypeScript + Vite frontend: public website, patient portal and staff portal, backed by one shared typed mock data store. This project sits alongside the existing Angular frontend and .NET backend.

## Run

Use Node 22.12+ or Node 24 LTS and npm. From this directory:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173. Alternatively, run `start-react-demo.bat` in the repository root. No database, SMTP credentials or backend process is needed for this demonstration.

```powershell
npm run build
npm run preview
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

The build is in `dist/`. Production hosting must rewrite non-asset paths to `index.html` for React Router. The e2e suite starts its own local Vite server unless port 5173 is already serving this project. Screenshots are generated in `artifacts/`; the browser test report is in `playwright-report/`.

## Demo accounts

Use the role buttons on `/login`, or these accounts with password `Demo123!`:

| Role                     | Email                | View                                                                    |
| ------------------------ | -------------------- | ----------------------------------------------------------------------- |
| Patient                  | patient@demo.local   | Own appointments, details, receipts, documents, preferences             |
| Reception                | reception@demo.local | Booking, patient contacts, calendar, demo payments and reports          |
| Dentist                  | dentist@demo.local   | Own schedule, associated patient contacts and fictional clinical intake |
| Administrator            | admin@demo.local     | All practice tools, fees, availability, content and staff roles         |
| Second fictional dentist | daniel@demo.local    | Second dentist's schedule                                               |

Registration creates another fictional patient. Password recovery records a mock request and reports that no email was sent. Roles control visible screens and mock service actions. This browser-side demo is not a real authentication or data protection boundary; all records, including demo passwords, are local fictional data. Do not enter real personal, clinical, payment or identity information.

Records persist under `dentalcare-react-demo-v1` in localStorage and update across tabs. `Reset demo data` restores date-relative starter records and signs out. Reset after changing the seed data to pick up the new starter records. Browser storage must be enabled for persistence across reloads. This mock is intended for a single browser demonstration, not server-authoritative concurrent scheduling across devices.

## Screens and interactions

- Public: home, about/team, 15 grouped services and detail pages with enlarged visuals, consultation information, FAQs, contact/directions, policies, login, registration and password recovery.
- Patient: next-appointment dashboard, appointments/history/search, appointment details, rescheduling/cancellation dialogs, profile, receipts and printing, intake/document metadata, notification preferences and updates.
- Booking: nine stages with preserved form data on Back/Continue, live summary, date/time availability, patient details, fictional intake, review, optional mock deposit and confirmation/reference. Patients book consultations; staff can schedule practice-approved treatment types.
- Staff: overview, day/week/month/list calendar, date/dentist/type/status filters, patient lookup/details, manual telephone/reception bookings, appointment status and booking changes, payments and refunds, availability/breaks/leave, consultation fees/durations/deposits, service publication, website content, staff creation/status/roles and CSV reports.

All times use Africa/Johannesburg (SAST, UTC+2). Scheduling checks working days, hours, breaks, leave, appointment length, existing appointments and future dates. Saturday availability is capped at 13:00. Checkout holds last five minutes and block overlapping dentist bookings. Failed payment keeps the hold for retry; expiry and cancellation release it. Choose Success, Failure or Expired in the mock payment selector. No card fields or real fund transfers exist. Recorded payments/refunds and report values derive from shared records.

Patients can change their appointments before the configurable online change deadline. Reception can assist later. Existing bookings remain visible when working hours change; adding a block that overlaps an active appointment is rejected. Rescheduling preserves reference and recorded payments. Disabling a dentist or changing their role does not silently remove existing bookings. Role changes away from dentist are rejected while that dentist has upcoming active bookings. File uploads validate PDF/JPG/PNG up to 5 MB, show progress, and retain metadata only; file contents are never uploaded or retained.

## Configuration and backend connection

- `src/config.ts`: editable brand name, logo path, colours, locale/time zone, initial contact details and website content. Brand colours are applied as CSS variables in `src/main.tsx`; replace `public/images/logo.svg` for supplied branding.
- `src/domain.ts`: typed models for patients, dentists, roles, services, appointment types, bookings, availability, documents, notifications and payments.
- `src/seed.ts`: fictional people, fees, services and date-relative starter appointments.
- `src/services/mock.ts`: typed `authService`, `bookingService`, `patientService`, `adminService`, slot generation, temporary reservation rules and shared store. Replace these implementations with authenticated API calls while keeping their typed interfaces.
- `src/services/adapters.ts`: separate notification, payment and metadata-upload boundaries. `backendConfiguration` contains a future `VITE_API_BASE_URL`; setting it alone does not enable network requests.
- `src/components/`: navigation/layouts, UI primitives, document metadata uploader, service visuals and cards, appointment cards, dialogs, status badges and progress.
- `src/pages/`: route screens; React Router is wired in `src/App.tsx`.

The React demo deliberately has no connection to the existing backend. For a real connection, implement server authentication/authorization, server-authoritative reservation/expiry transactions, reviewed medical content, approved privacy/policies, authenticated document handling, a payment provider and email/SMS delivery. The existing .NET/Angular SMTP work remains separate; SMTP is the selected email integration for that application.

## Image assets and review status

Bundled optimized stock JPEGs total approximately 594 KB. The hero is prioritized; other photography uses lazy loading. Images have descriptive alternative text and scale responsively. Stock photography illustrates a fictional practice; it does not represent this practice's staff, patients or results. There are no fabricated patient testimonials, professional credentials or before/after results.

Photographs were downloaded from Unsplash's image CDN under the [Unsplash License](https://unsplash.com/license). Exact sources:

| Included file                           | Subject                                               | Source                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `public/images/practice.jpg`            | Bright dental treatment room, homepage/authentication | [Original image](https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=85) |
| `public/images/team-care.jpg`           | Dental practice environment, about page               | [Original image](https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=1200&q=85) |
| `public/images/dental-consultation.jpg` | Generic dental examination                            | [Original image](https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1400&q=85) |
| `public/images/dental-care.jpg`         | Removable clear aligner                               | [Original image](https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1000&q=85) |

The logo and SVG service illustrations are project-created assets. Educational visuals are explicitly labelled placeholders awaiting dental review. Replace them with dentist-reviewed procedure diagrams before real publication, especially detailed crown/bridge, denture, veneer/bonding, wisdom tooth, fixed-braces and implant depictions. Children's care uses a friendly illustrated placeholder while an authorised child check-up image awaits practice supply. Preparation, aftercare and professional profiles are marked as sample/awaiting approval. Enlarged views repeat these review labels. The location map is an illustrated placeholder; the directions action opens a map search for the editable sample address.

## Verification

Unit tests cover overlapping reservations, expiry, working hours/leave/breaks, disabled offerings, competing requests, failed payment retry, duplicate payment rejection, rescheduling/cancellation, access restrictions, payment/refund records and blocked periods. Browser tests exercise complete patient flows, registration/recovery validation, uploads, preferences, content/service publication and role views, with navigation/layout checks at 390, 768 and 1440 px. Accessibility tests scan public/portal screens and verify dialog keyboard behavior. Use `npm run test:e2e` to reproduce the checks and screenshots.
