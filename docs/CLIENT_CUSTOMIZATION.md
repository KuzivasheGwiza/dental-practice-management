# Client customization notes

The codebase is intentionally practice-neutral so the same platform can be configured for either audited practice without duplicating the application.

## Dr Waseema Hamid & Associates version

Recommended customisation emphasis:

- Make WhatsApp a prominent contact/booking-support option.
- Add the approved Dr Hamid biography and qualifications to the public About section.
- Centralise contact, location, hours, services and reviews on the owned domain.
- Repair/reconnect the external social profiles once the website is live.
- Replace the generic seeded opening hours with the final hours confirmed by the practice.

## Dr Farhana Hassim Dental Practice version

Recommended customisation emphasis:

- Give Emergency Care strong placement on the public site.
- Keep `Emergency Consultation` as an emergency service in the booking catalogue.
- Feature approved patient-review excerpts as social proof.
- Replace old/static promotional information with current service content.
- Replace the generic seeded opening hours with the final hours confirmed by the practice.

## Files to change first

Backend seed/configuration:

`backend/DentalPractice.API/Data/DbSeeder.cs`

Frontend practice name:

`frontend/dental-practice-ui/src/environments/environment.ts`

Production frontend practice name/API path:

`frontend/dental-practice-ui/src/environments/environment.production.ts`

For a real deployment, practice contact/branding values should ultimately be editable through administration rather than hard-coded seed values.
