# Database notes

The authoritative model is the Entity Framework Core model under:

`backend/DentalPractice.API/Models` and `Data/ApplicationDbContext.cs`.

During Development, `DbSeeder.InitializeAsync` calls `EnsureCreatedAsync()` and seeds:

- Identity roles
- A practice record
- Appointment statuses
- Common dental services
- Practice hours
- Demo Admin, Dentist and Receptionist accounts
- A demo dentist
- Dentist/service links
- Dentist availability

For production, replace `EnsureCreatedAsync()` with a normal EF Core migration strategy so schema changes can be reviewed and versioned.

## Existing database upgrade: user profiles and profile pictures

If `DentalPracticeDb` already existed before the profile feature was added, run:

```text
database/upgrade-profile-v2.sql
```

`EnsureCreatedAsync()` creates the current schema only for a brand-new database; it does not add columns to an existing database. The upgrade script adds the profile-image metadata columns to `AspNetUsers` and enables Identity lockout for existing accounts.

## Existing database upgrade: appointment payments / PayFast

After the profile upgrade, run:

```text
database/upgrade-payments-v3.sql
```

This adds service-level PayFast booking amounts, appointment payment state, reservation-expiry fields, and the `AppointmentPayments` transaction table. Existing appointments are preserved as secured cash-at-practice records.
