# API route reference

Base development URL: `http://localhost:5144/api`

## Public

| Method | Route | Purpose |
|---|---|---|
| GET | `/practice` | Practice contact/configuration information |
| GET | `/services` | Active services |
| GET | `/dentists?serviceId=1` | Active dentists, optionally filtered by service |
| GET | `/availability?dentistId=1&serviceId=1&date=2026-09-14` | Available booking slots |
| POST | `/auth/register` | Register patient portal account |
| POST | `/auth/login` | Login and obtain JWT |

## Authenticated profile

Requires any authenticated user role.

| Method | Route | Purpose |
|---|---|---|
| GET | `/profile` | Get the current user profile |
| PUT | `/profile` | Update the current user's permitted personal/profile fields |
| GET | `/profile/photo` | Return the current user's profile picture |
| POST | `/profile/photo` | Upload/replace profile picture as multipart form field `file` |
| DELETE | `/profile/photo` | Remove current profile picture |

Profile image uploads accept JPG, PNG or WebP up to 5 MB.

## Patient

Requires `Patient` role.

| Method | Route | Purpose |
|---|---|---|
| GET | `/patients/me` | Current patient profile |
| PUT | `/patients/me` | Update profile |
| GET | `/appointments` | Current patient's appointments |
| GET | `/appointments/{id}` | One owned appointment |
| POST | `/appointments` | Create booking |
| PUT | `/appointments/{id}/reschedule` | Move appointment to a valid slot |
| PUT | `/appointments/{id}/cancel` | Cancel appointment with reason |

## Staff

Requires Receptionist, Dentist or Administrator.

| Method | Route | Purpose |
|---|---|---|
| GET | `/staff/appointments?date=2026-09-14` | Daily appointment schedule |
| POST | `/staff/appointments` | Create booking for a patient |
| POST | `/staff/appointments/{id}/payments/cash` | Reception/Admin records cash received at the practice |
| PUT | `/staff/appointments/{id}/status` | Change workflow status |

## Administrator

Requires Administrator role.

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/summary` | Dashboard counts |
| GET | `/admin/services` | Service administration list |
| POST | `/admin/services` | Create service |
| PUT | `/admin/services/{id}` | Update service |
| GET | `/admin/staff` | Staff list |
| POST | `/admin/staff` | Create staff user/profile |
| PUT | `/admin/staff/{id}/active` | Activate/deactivate staff |
| GET | `/admin/audit-logs` | Recent audit history |
| GET | `/admin/dentists/{id}/availability` | Dentist recurring schedule |
| POST | `/admin/dentists/{id}/availability` | Add recurring availability |
| DELETE | `/admin/dentists/{id}/availability/{availabilityId}` | Remove availability |
| GET | `/admin/dentists/{id}/exceptions` | Blocked/exception periods |
| POST | `/admin/dentists/{id}/exceptions` | Add blocked/exception period |
| DELETE | `/admin/dentists/{id}/exceptions/{exceptionId}` | Remove blocked period |

Swagger provides the exact request/response schemas when the API is running in Development.

## Patient payments

Requires `Patient` role unless stated otherwise.

| Method | Route | Purpose |
|---|---|---|
| GET | `/payments/config` | Return whether PayFast is available and the payment-window/minimum settings |
| GET | `/payments/appointments/{bookingReference}` | Read the signed-in patient's appointment/payment state |
| POST | `/payments/appointments/{bookingReference}/payfast-checkout` | Create/retry PayFast hosted checkout for an unpaid pending booking |
| POST | `/payments/appointments/{bookingReference}/cancel-pending` | Release an unpaid PayFast booking hold |
| POST | `/payments/payfast/itn` | **Anonymous PayFast callback only**; validates ITN before changing appointment/payment state |

`POST /appointments` now requires `paymentMethod` with either `CASH_AT_PRACTICE` or `PAYFAST`. Cash bookings are confirmed immediately and remain due at the practice. PayFast bookings are held as Pending until a verified `COMPLETE` ITN is received.
