# Entity Relationship Design

## Core entities

### Practice
Owns practice-level configuration: name, contact details, services, patients, staff, appointments and operating hours.

### ApplicationUser / Identity roles
ASP.NET Core Identity is the authentication source. Users may have roles such as Patient, Receptionist, Dentist and Administrator. The user record also stores private profile-picture metadata (`ProfileImageFileName`, content type and last-updated timestamp); the image bytes are stored outside the public web root.

### Patient
Stores non-clinical patient profile/contact information. `UserId` is nullable so reception can create a patient before that person creates a portal account.

### Staff
Stores practice employee information and links to an Identity user.

### Dentist
A dentist-specific extension of Staff. A Staff record can have zero or one Dentist record.

### Service
A configurable dental service including default appointment duration and optional starting price.

### DentistService
Many-to-many link describing which dentists perform which services, with an optional dentist-specific duration.

### AppointmentStatus
Lookup table for Pending, Confirmed, Checked In, In Progress, Completed, Cancelled and No Show.

### Appointment
Central transaction connecting Practice, Patient, Dentist, Service and AppointmentStatus.

### DentistAvailability
Recurring working blocks by day of week and effective date range.

### AvailabilityException
Specific blocked periods such as leave, training, meetings or closure.

### PracticeHours
Practice opening and closing hours by day.

### Notification
Queue/audit record for appointment confirmations, reminders, rescheduling and cancellation messages.

### AuditLog
Records important actions, target entity, previous/new values and request context.

## Main cardinalities

```text
Practice 1 ---- * Patient
Practice 1 ---- * Staff
Practice 1 ---- * Service
Practice 1 ---- * Appointment
Practice 1 ---- * PracticeHours

ApplicationUser 1 ---- 0..1 Patient
ApplicationUser 1 ---- 0..1 Staff
ApplicationUser * ---- * IdentityRole

Staff 1 ---- 0..1 Dentist
Dentist * ---- * Service   (through DentistService)

Patient 1 ---- * Appointment
Dentist 1 ---- * Appointment
Service 1 ---- * Appointment
AppointmentStatus 1 ---- * Appointment

Dentist 1 ---- * DentistAvailability
Dentist 1 ---- * AvailabilityException
Appointment 1 ---- * Notification
ApplicationUser 1 ---- * AuditLog
```

The generated visual concept is available as `database-erd.png` in this folder.
