import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PublicLayout, PortalLayout, RequireRole } from "./components/layout";
import {
  About,
  Contact,
  Consultations,
  FAQs,
  Home,
  NotFound,
  Policies,
  ServiceDetail,
  Services,
} from "./pages/public";
import { AuthPage } from "./pages/auth";
import { BookingWizard } from "./pages/booking";
import {
  AppointmentDetail,
  PatientAppointments,
  PatientDocuments,
  PatientNotifications,
  PatientOverview,
  PatientPayments,
  PatientProfile,
} from "./pages/patient";
import {
  StaffAvailability,
  StaffCalendar,
  StaffConsultations,
  StaffContent,
  StaffOverview,
  StaffPatients,
  StaffReports,
  StaffTeam,
} from "./pages/staff";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="consultations" element={<Consultations />} />
          <Route path="faqs" element={<FAQs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="policies" element={<Policies />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route path="forgot-password" element={<AuthPage mode="recover" />} />
        </Route>
        <Route element={<RequireRole roles={["patient"]} />}>
          {" "}
          <Route element={<PortalLayout />}>
            <Route path="book" element={<BookingWizard />} />
            <Route path="portal">
              <Route index element={<PatientOverview />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="appointments/:id" element={<AppointmentDetail />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="documents" element={<PatientDocuments />} />
              <Route path="notifications" element={<PatientNotifications />} />
              <Route path="payments" element={<PatientPayments />} />
            </Route>
          </Route>
        </Route>
        <Route
          element={
            <RequireRole roles={["dentist", "receptionist", "administrator"]} />
          }
        >
          {" "}
          <Route path="staff" element={<PortalLayout staff />}>
            <Route index element={<StaffOverview />} />
            <Route path="calendar" element={<StaffCalendar />} />
            <Route path="patients" element={<StaffPatients />} />
            <Route path="book" element={<BookingWizard staff />} />
            <Route
              path="appointments/:id"
              element={<AppointmentDetail staff />}
            />
            <Route path="availability" element={<StaffAvailability />} />
            <Route path="consultations" element={<StaffConsultations />} />
            <Route path="content" element={<StaffContent />} />
            <Route path="team" element={<StaffTeam />} />
            <Route path="reports" element={<StaffReports />} />
          </Route>
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
