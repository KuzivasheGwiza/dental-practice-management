# PayFast appointment-payment integration

The patient booking flow now supports two choices:

1. **Cash at the practice** — the appointment is confirmed immediately and marked `CASH_DUE`.
2. **Pay online with PayFast** — the slot is held temporarily in `Pending` status, and the appointment is only secured after a valid PayFast ITN confirms the payment.

## Why hosted PayFast checkout is used

The application posts a signed checkout form to PayFast's hosted payment page. Card/bank credentials are therefore not collected or stored by the dental application.

## Required configuration

Set the `PayFast` section in API configuration using deployment secrets/environment-specific configuration. Never commit live credentials.

```json
"PayFast": {
  "Enabled": true,
  "Sandbox": true,
  "MerchantId": "YOUR_MERCHANT_ID",
  "MerchantKey": "YOUR_MERCHANT_KEY",
  "Passphrase": "YOUR_PAYFAST_PASSPHRASE",
  "FrontendBaseUrl": "https://portal.example.co.za",
  "PublicApiBaseUrl": "https://api.example.co.za",
  "PaymentWindowMinutes": 15,
  "RequireIpValidation": true
}
```

`PublicApiBaseUrl` must be reachable by PayFast. For live payments it must be HTTPS.

The ITN endpoint is:

```text
POST /api/payments/payfast/itn
```

The implementation validates:

- configured merchant ID;
- PayFast security signature;
- source IP against official PayFast hostnames when `RequireIpValidation` is enabled;
- payment amount against the server-side appointment payment amount;
- PayFast server confirmation using `/eng/query/validate`;
- merchant payment ID and booking reference;
- duplicate PayFast transaction IDs.

Only a verified `COMPLETE` ITN changes a PayFast appointment to `Confirmed` and `PAID`.

## Sandbox

PayFast's official developer documentation publishes test credentials, but a practice should preferably create its own Sandbox account. The checked-in Development configuration keeps PayFast disabled until a public API callback URL is supplied intentionally.

When testing from a local machine, expose the API through an approved HTTPS development tunnel and set `PayFast:PublicApiBaseUrl` to that public URL. Do not turn off ITN verification simply to make local testing easier.

## Configure each dental service

An administrator must set **PayFast booking payment** on each service that should accept online payment. This is deliberately separate from `StartingPrice` because a dental service's displayed starting price is not necessarily the exact amount the practice wants to collect when securing an appointment.

If the booking payment is empty or below PayFast's supported minimum, the PayFast option is unavailable for that service and the patient can still select cash at the practice.

## Reservation expiry

A PayFast booking starts as:

```text
Appointment status: Pending
Payment status: PENDING
IsSecured: false
```

The slot blocks other bookings only until `PaymentExpiresAtUtc`. A background worker expires unpaid holds and releases the slot.

If a valid payment arrives after the hold has expired, the system attempts to secure the original appointment only if the slot is still free. If the time was already taken, the payment is recorded as `PAID_REVIEW_REQUIRED` and the practice must resolve the appointment/payment manually instead of double-booking the dentist.

## Cancellations and refunds

Cancelling an appointment that already has a recorded PayFast payment does **not** automatically issue a refund. The system flags the cancellation in the notification/audit flow so the practice can review the transaction. Automated refunds should only be added after the practice defines its refund rules and the PayFast refund API workflow is fully tested.

## Database upgrade

For an existing database, run:

```text
database/upgrade-profile-v2.sql
database/upgrade-payments-v3.sql
```

A brand-new database created from the current EF Core model already contains the payment columns/table.

## Cash-at-practice flow

Cash remains a separate supported booking path. A patient choosing cash gets a confirmed appointment immediately with `PaymentStatus = CASH_DUE`. Receptionists and administrators can use the staff dashboard to record the amount actually received at the practice. That action creates an `AppointmentPayments` transaction, changes the appointment payment status to `PAID`, queues a receipt notification, and writes an audit entry. Dentists can view the payment status but cannot record cash payments.

## Staff safeguards

An unpaid PayFast booking cannot be manually moved by staff into Confirmed, Checked In, In Progress, or Completed. The booking must first receive a verified PayFast `COMPLETE` ITN, or be cancelled and recreated as a cash-at-practice booking. This prevents the hosted checkout state from being bypassed through the staff dashboard.

Repeated successful ITNs for the same transaction are treated idempotently. If a different successful PayFast attempt arrives after the appointment is already secured, the appointment stays secured and the additional payment is flagged `PAID_REVIEW_REQUIRED` for manual review/refund instead of being silently accepted as a normal second charge.
