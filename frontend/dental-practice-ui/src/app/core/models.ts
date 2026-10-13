export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  roles: string[];
  displayName: string;
  mfaEnrollmentRequired?: boolean;
}

export interface DentalService {
  serviceId: number;
  name: string;
  description?: string;
  defaultDurationMinutes: number;
  startingPrice?: number;
  bookingPaymentAmount?: number;
  isEmergencyService: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface Dentist {
  dentistId: number;
  name: string;
  professionalNumber?: string;
  qualifications?: string;
  bio?: string;
  profileImageUrl?: string;
  services: { serviceId: number; name: string; durationMinutes: number }[];
}

export interface AvailabilitySlot {
  startDateTime: string;
  endDateTime: string;
}

export interface Appointment {
  appointmentId: number;
  bookingReference: string;
  patientId: number;
  patientName: string;
  dentistId: number;
  dentistName: string;
  serviceId: number;
  serviceName: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  bookingSource: string;
  patientNotes?: string;
  cancellationReason?: string;
  paymentMethod: string;
  paymentStatus: string;
  amountDueAtBooking: number;
  amountPaid: number;
  isSecured: boolean;
  paymentExpiresAtUtc?: string;
}

export interface PayFastCheckout {
  paymentUrl: string;
  fields: Record<string, string>;
  expiresAtUtc: string;
}

export interface BookingResponse {
  appointment: Appointment;
  payFast?: PayFastCheckout;
  message: string;
}

export interface PaymentConfig {
  payFastEnabled: boolean;
  paymentWindowMinutes: number;
  minimumAmount: number;
  currency: string;
}

export interface AppointmentPaymentStatus {
  bookingReference: string;
  appointmentStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  amountDueAtBooking: number;
  amountPaid: number;
  paymentExpiresAtUtc?: string;
  isSecured: boolean;
  payFastPaymentId?: string;
}

export interface Practice {
  practiceId: number;
  name: string;
  tradingName?: string;
  phone?: string;
  whatsAppNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  logoUrl?: string;
  websiteUrl?: string;
  hours: PracticeHours[];
}

export interface PracticeHours {
  day: string | number;
  openingTime?: string;
  closingTime?: string;
  isClosed: boolean;
}

export interface AdminSummary {
  todaysAppointments: number;
  nextSevenDays: number;
  activePatients: number;
  activeDentists: number;
  activeServices: number;
  pendingNotifications: number;
}

export interface AuditLog {
  auditLogId: number;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAtUtc: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  hasProfileImage: boolean;
  profileImageUpdatedAtUtc?: string;
  patientId?: number;
  dateOfBirth?: string;
  alternativePhone?: string;
  preferredContactMethod?: string;
  staffId?: number;
  staffNumber?: string;
  jobTitle?: string;
  dentistId?: number;
  professionalNumber?: string;
  qualifications?: string;
  bio?: string;
}
