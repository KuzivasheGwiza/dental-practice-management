# Manual test plan

## Authentication

- Register a new patient with valid data.
- Reject an already registered email.
- Reject an invalid password.
- Login as patient, receptionist, dentist and administrator.
- Confirm a patient cannot access `/api/admin/*`.
- Confirm a receptionist cannot access administrator routes.

## User profile

- Login as Patient, Receptionist, Dentist and Administrator and confirm `/profile` is accessible to each role.
- Update first name, last name, email and phone number; logout/login again and confirm the changes persist.
- Attempt to change the email to one already used by another account and confirm the request is rejected.
- Patient: update date of birth, alternative phone and preferred contact method.
- Reject a future patient date of birth.
- Staff: confirm job title and staff number are displayed as read-only.
- Dentist: update professional profile fields.
- Upload valid JPG, PNG and WebP profile pictures.
- Reject a file larger than 5 MB.
- Reject a non-image file renamed with an image extension.
- Replace an existing profile picture and confirm the old file is removed from storage.
- Remove the profile picture and confirm the initials fallback is displayed.
- Confirm another authenticated user cannot request the current user's private profile-picture file directly.
- Confirm profile update/upload/removal actions appear in the audit log.
- Confirm five failed sign-in attempts trigger temporary account lockout for accounts with lockout enabled.

## Booking

- Display active services.
- Filter dentists by selected service.
- Display only future available slots.
- Reject a slot outside practice hours.
- Reject a slot outside dentist availability.
- Reject a slot overlapping an availability exception.
- Create an appointment successfully.
- Attempt the same slot again and confirm the second booking is rejected.
- Cancel the first appointment and confirm the old slot becomes available.
- Reschedule to a valid slot.
- Reject rescheduling to a conflicting slot.

## Patient portal

- Patient sees their own bookings only.
- Patient cannot retrieve another patient's appointment by ID.
- Cancellation reason is recorded.
- Appointment history shows completed/cancelled bookings.

## Staff workflow

- View today's schedule.
- Create a phone booking.
- Create a WhatsApp booking.
- Check patient in.
- Move to In Progress.
- Complete appointment.
- Record No Show.
- Cancel from staff dashboard.

## Administration

- Add service.
- Create receptionist.
- Create dentist.
- Add dentist availability.
- Remove dentist availability.
- Add blocked period through API/Swagger.
- Confirm audit log records important actions.

## Payments

- Configure a service with a PayFast booking amount of at least R5.00.
- Confirm a patient can choose **Cash at the practice** and the appointment is immediately `Confirmed`, `CASH_DUE`, and secured.
- Login as Receptionist/Administrator, record the cash amount received, and confirm the appointment becomes `PAID` with an `AppointmentPayments` record and audit entry.
- Confirm a Dentist cannot use the cash-payment recording endpoint.
- Confirm a PayFast-enabled service offers **Pay online with PayFast**.
- Confirm a PayFast booking starts `Pending` and reserves the slot only for the configured payment window.
- Confirm an unpaid PayFast hold prevents a second booking during the hold.
- Confirm a valid PayFast `COMPLETE` ITN marks the payment `PAID`, secures the appointment, and changes the appointment to `Confirmed`.
- Confirm an invalid ITN signature is rejected.
- Confirm an ITN from an unapproved source IP is rejected when IP validation is enabled.
- Confirm an ITN with a different amount is rejected.
- Confirm a duplicate PayFast transaction ID is rejected.
- Confirm repeating the same valid `COMPLETE` ITN is idempotent and does not double-count the payment.
- Confirm a failed/cancelled PayFast attempt can be retried while the reservation is still active.
- Confirm an unpaid hold expires and the slot becomes available again.
- Confirm a valid late payment re-secures the appointment only if the time is still free; otherwise it is flagged `PAID_REVIEW_REQUIRED`.
- Confirm a second successful payment against an already-secured booking leaves the booking secured and flags the extra payment for manual review/refund.
- Confirm staff cannot manually progress an unpaid PayFast appointment to Confirmed/Checked In/In Progress/Completed.
- Cancel a paid PayFast appointment and confirm no automatic refund is issued; the cancellation is flagged for practice review.

## UI

- Desktop layout.
- Tablet layout.
- Mobile layout.
- Refresh a protected route while logged in.
- Expired JWT results in re-authentication.
- API errors are shown without exposing stack traces.
