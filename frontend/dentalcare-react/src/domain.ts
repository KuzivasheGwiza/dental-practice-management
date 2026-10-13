export type Role = "patient" | "dentist" | "receptionist" | "administrator";
export type AppointmentStatus =
  | "Awaiting approval"
  | "Awaiting payment"
  | "Confirmed"
  | "Checked in"
  | "Completed"
  | "Cancelled"
  | "No-show";
export type PaymentStatus =
  "Unpaid" | "Pending" | "Paid" | "Failed" | "Expired" | "Refunded";
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  active: boolean;
}
export interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  preferences: { email: boolean; sms: boolean; reminders: boolean };
  documents: DemoDocument[];
}
export interface Dentist {
  id: string;
  userId: string;
  name: string;
  initials: string;
  focus: string;
  bio: string;
  colour: string;
}
export interface DentalService {
  id: string;
  name: string;
  group: string;
  summary: string;
  visual: string;
  enabled: boolean;
  consultationId: string;
  overview: string;
  expectations: string;
  preparation: string;
  aftercare: string;
}
export interface ConsultationType {
  id: string;
  name: string;
  duration: number;
  fee: number;
  deposit: number;
  enabled: boolean;
  patientBookable: boolean;
}
export interface Appointment {
  id: string;
  reference: string;
  patientId: string;
  dentistId: string;
  consultationId: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  fee: number;
  deposit: number;
  paid: number;
  source: string;
  intake: { reason: string; accessibility: string; acknowledged: boolean };
  documents: DemoDocument[];
  holdExpires?: number;
}
export interface Availability {
  dentistId: string;
  weekdays: number[];
  start: string;
  end: string;
}
export interface AvailabilityBlock {
  id: string;
  dentistId: string;
  date: string;
  endDate: string;
  start: string;
  end: string;
  reason: string;
}
export interface DemoDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}
export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  date: string;
  status: "Recorded" | "Refunded";
  method: string;
}
export interface Notification {
  id: string;
  patientId: string;
  appointmentId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  kind: "confirmation" | "reminder" | "change" | "payment";
}
export interface SiteContent {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  hours: string;
  heroHeadline: string;
  heroCopy: string;
  preparation: string;
  cancellationHours: number;
  policy: string;
  privacy: string;
  faqs: { question: string; answer: string }[];
}
export interface DemoState {
  version: number;
  users: User[];
  patients: Patient[];
  dentists: Dentist[];
  services: DentalService[];
  consultations: ConsultationType[];
  appointments: Appointment[];
  availability: Availability[];
  blocks: AvailabilityBlock[];
  payments: Payment[];
  notifications: Notification[];
  content: SiteContent;
  sessionUserId: string | null;
  recoveryRequests: { id: string; email: string; createdAt: string }[];
}
export interface BookingDraft {
  patientId: string;
  dentistId: string;
  consultationId: string;
  serviceId: string;
  date: string;
  time: string;
  intake: Appointment["intake"];
  documents: DemoDocument[];
  source: string;
}
