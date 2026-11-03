# Case study: Digital appointment and practice-management platform for a Zimbabwean dental practice

## 1. Client problem

The dental surgeon's current booking workflow requires patients to visit the practice, speak to reception, arrange and pay for a consultation, and then return later for their appointment. Patients have limited remote visibility into upcoming consultations and revisits. This description reflects the **specific client's reported process**, not a claim about every practice or health IT system in Zimbabwe.

## 2. Project goal

Design and develop an online platform combining a public practice website with appointment booking, patient accounts/dashboards, revisit information, payment integration and staff-facing scheduling administration.

## 3. Before and intended after

| Existing process | Digital process being developed |
| --- | --- |
| Patient travels to practice to ask about services | Patient reviews information and services online |
| Receptionist records a consultation booking in person | Patient requests/selects an available appointment online |
| Payment or booking arrangement occurs at reception | Patient uses a supported online payment process where enabled |
| Patient receives a return date | Patient can view consultation/revisit details through their account |
| Staff handle scheduling through reception | Staff view and manage booking records through role-based interfaces |

## 4. Core business rules

- Appointment slots must not conflict with existing confirmed bookings.
- Only authenticated users should see private patient-facing information.
- Different roles (patient, reception, clinician, administrator) should have appropriate data access.
- Booking changes and payment statuses should be handled consistently, not inferred from frontend display alone.
- Any patient revisit reminders or messages require appropriate consent and privacy safeguards.

## 5. Implementation approach

The repository includes a **React demonstration** of user journeys and an **Angular + ASP.NET Core** full-stack implementation using SQL Server and Entity Framework Core. The marketing/public-site component introduces the practice and its services. API workflows support bookings and practice operations; manual API verification is performed through Swagger UI.

The current project status is **in development**. This case study describes the client challenge and software direction; it does not assert a live launch, completed payment settlement in Zimbabwe, reduction in waiting times or measured operational impact.

## 6. Technical considerations for launch

1. Confirm the correct payment gateway and merchant settlement options for Zimbabwe.
2. Prevent duplicate appointment reservations on the **server side**, including concurrency checks.
3. Verify patient privacy, role-based authorisation and access logging.
4. Use protected configuration and real deployment secrets outside source control.
5. Test the complete booking, payment confirmation, cancellation and revisit communication journeys with fictional data before launch.
6. Get the client to approve public branding, images and demonstrations.

## 7. What success could be measured by after deployment

Once live and approved, collect baseline and post-launch data for in-person booking visits, booking completion rates, payment reconciliation, no-show rates and receptionist handling time. **No unmeasured improvement should be reported as achieved.**