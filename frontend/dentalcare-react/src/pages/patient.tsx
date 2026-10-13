import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Pencil,
  Phone,
  Printer,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Appointment, DemoDocument } from "../domain";
import { useAction, useDemo, useNow } from "../hooks";
import { bookingService, patientService } from "../services/mock";
import { dateLabel, money, timestamp, today } from "../time";
import {
  AppointmentCard,
  Badge,
  Button,
  DocumentUploader,
  Empty,
  Field,
  LinkButton,
  Modal,
  Notice,
  PageHeading,
  SearchInput,
  Stats,
} from "../components/ui";

function usePatient() {
  const state = useDemo(),
    user = state.users.find((u) => u.id === state.sessionUserId);
  return {
    state,
    user,
    patient: state.patients.find((p) => p.userId === user?.id),
  };
}
export function PatientOverview() {
  const now = useNow();
  const { state: s, patient } = usePatient();
  const appointments = s.appointments.filter(
      (a) => a.patientId === patient?.id,
    ),
    upcoming = appointments
      .filter(
        (a) =>
          !["Cancelled", "Completed", "No-show"].includes(a.status) &&
          timestamp(a.date, a.time) > now,
      )
      .sort((a, b) => timestamp(a.date, a.time) - timestamp(b.date, b.time)),
    next = upcoming[0],
    unread = s.notifications.filter(
      (n) => n.patientId === patient?.id && !n.read,
    );
  return (
    <>
      <PageHeading
        eyebrow="YOUR PATIENT PORTAL"
        title={`Hello, ${patient?.name.split(" ")[0] ?? "there"}.`}
        description="A little peace of mind. Your upcoming care, all in one place."
        action={
          <LinkButton to="/book">
            Book a consultation <ArrowRight size={17} />
          </LinkButton>
        }
      />
      <div className="section-label">
        <h2>Your next appointment</h2>
        <Link to="/portal/appointments" className="text-link">
          View all appointments <ArrowRight size={16} />
        </Link>
      </div>
      {next ? (
        <AppointmentCard
          featured
          appointment={next}
          actions={
            <>
              <LinkButton
                to={`/portal/appointments/${next.id}`}
                variant="primary"
              >
                View details <ArrowRight size={16} />
              </LinkButton>
              <LinkButton
                to={`/portal/appointments/${next.id}?action=reschedule`}
                variant="secondary"
              >
                Reschedule
              </LinkButton>
              <LinkButton
                to={`/portal/appointments/${next.id}?action=cancel`}
                variant="ghost"
              >
                Cancel appointment
              </LinkButton>
            </>
          }
        />
      ) : (
        <Empty
          title="Your next visit starts here"
          description="Choose a consultation and find an available time."
          action={<LinkButton to="/book">Book a consultation</LinkButton>}
        />
      )}
      <Stats
        items={[
          {
            label: "Upcoming visits",
            value: upcoming.length,
            detail: "Planned around your day",
          },
          {
            label: "Completed visits",
            value: appointments.filter((a) => a.status === "Completed").length,
            detail: "Your appointment history",
          },
          {
            label: "Unread notifications",
            value: unread.length,
            detail: "Updates from your demo practice",
          },
        ]}
      />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-label">
            <h2>A few helpful shortcuts</h2>
          </div>
          <div className="shortcut-grid">
            {[
              {
                to: "/portal/profile",
                Icon: UserRound,
                title: "Your details",
                text: "Keep your profile up to date",
              },
              {
                to: "/portal/payments",
                Icon: CreditCard,
                title: "Payments & receipts",
                text: "Review demo deposits and balances",
              },
              {
                to: "/portal/documents",
                Icon: FileText,
                title: "Get ready for your visit",
                text: "Manage demonstration documents",
              },
            ].map(({ to, Icon, title, text }) => (
              <Link key={to} to={to} className="shortcut">
                <Icon size={26} />
                <strong>{title}</strong>
                <span>{text}</span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel mint-panel">
          <ShieldCheck size={27} />
          <h2>A little preparation helps.</h2>
          <p>{s.content.preparation}</p>
          <Link to="/consultations" className="text-link">
            What to expect <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel">
        <div className="section-label">
          <h2>Recent updates</h2>
          <Link to="/portal/notifications" className="text-link">
            All notifications <ArrowRight size={16} />
          </Link>
        </div>
        {unread.slice(0, 2).map((n) => (
          <div className="notification-row" key={n.id}>
            <div className="round-icon">
              <Bell size={20} />
            </div>
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
            </div>
          </div>
        ))}
        {!unread.length && <p className="muted">You’re all caught up.</p>}
      </section>
    </>
  );
}
export function PatientAppointments() {
  const now = useNow();
  const { state: s, patient } = usePatient(),
    [tab, setTab] = useState<"upcoming" | "history" | "all">("upcoming"),
    [q, setQ] = useState("");
  const items = s.appointments.filter((a) => a.patientId === patient?.id),
    upcoming = (a: Appointment) =>
      !["Cancelled", "Completed", "No-show"].includes(a.status) &&
      timestamp(a.date, a.time) > now,
    filtered = items
      .filter(
        (a) =>
          (tab === "all" ||
            (tab === "upcoming" ? upcoming(a) : !upcoming(a))) &&
          (
            a.reference +
            " " +
            s.consultations.find((t) => t.id === a.consultationId)?.name
          )
            .toLowerCase()
            .includes(q.toLowerCase()),
      )
      .sort((a, b) =>
        tab === "history"
          ? timestamp(b.date, b.time) - timestamp(a.date, a.time)
          : timestamp(a.date, a.time) - timestamp(b.date, b.time),
      );
  return (
    <>
      <PageHeading
        title="My appointments"
        description="See what’s coming up and revisit your previous appointments."
        action={
          <LinkButton to="/book">
            Book a consultation <ArrowRight size={17} />
          </LinkButton>
        }
      />
      <div className="toolbar">
        <div className="tabs">
          {(["upcoming", "history", "all"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "upcoming"
                ? "Upcoming"
                : t === "history"
                  ? "Previous"
                  : "All appointments"}
            </button>
          ))}
        </div>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search appointments"
        />
      </div>
      <div className="appointment-list">
        {filtered.map((a) => (
          <AppointmentCard key={a.id} appointment={a} />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No appointments to show"
          description="Try a different filter or choose a new consultation time."
          action={
            <LinkButton to="/book" variant="secondary">
              Find a time
            </LinkButton>
          }
        />
      )}
    </>
  );
}
export function AppointmentDetail({ staff = false }: { staff?: boolean }) {
  const s = useDemo(),
    { id } = useParams(),
    [query, setQuery] = useSearchParams(),
    action = useAction();
  const user = s.users.find((u) => u.id === s.sessionUserId),
    patient = s.patients.find((p) => p.userId === user?.id);
  const a = s.appointments.find(
    (a) =>
      a.id === id &&
      (staff || a.patientId === patient?.id) &&
      (!(staff && user?.role === "dentist") ||
        s.dentists.find((d) => d.userId === user.id)?.id === a.dentistId),
  );
  const [dialog, setDialog] = useState<
      "cancel" | "reschedule" | "refund" | null
    >(
      query.get("action") === "cancel"
        ? "cancel"
        : query.get("action") === "reschedule"
          ? "reschedule"
          : null,
    ),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [amount, setAmount] = useState(""),
    [outcome, setOutcome] = useState<"success" | "failure" | "expired">(
      "success",
    );
  if (!a)
    return (
      <Empty
        title="Appointment not found"
        description="This booking is not available in your demonstration role."
        action={
          <LinkButton to={staff ? "/staff/calendar" : "/portal/appointments"}>
            Back to appointments
          </LinkButton>
        }
      />
    );
  const dentist = s.dentists.find((d) => d.id === a.dentistId),
    type = s.consultations.find((t) => t.id === a.consultationId),
    p = s.patients.find((p) => p.id === a.patientId),
    closed = ["Completed", "Cancelled", "No-show"].includes(a.status),
    clinical =
      !staff || user?.role === "dentist" || user?.role === "administrator",
    canMoney =
      staff &&
      (user?.role === "administrator" || user?.role === "receptionist"),
    available = date
      ? bookingService.slots(s, date, a.dentistId, a.consultationId, a.id)
      : [];
  function close() {
    setDialog(null);
    setQuery({}, { replace: true });
    action.setError("");
  }
  async function changeBooking() {
    if (!a) return;
    const result = await action.run(
      () =>
        dialog === "cancel"
          ? bookingService.cancel(a.id)
          : dialog === "refund"
            ? bookingService.refund(a.id)
            : bookingService.reschedule(a.id, date, time),
      "Appointment updated.",
    );
    if (result) close();
  }
  return (
    <>
      <div className="breadcrumbs">
        <Link to={staff ? "/staff/calendar" : "/portal/appointments"}>
          Appointments
        </Link>
        <span>/</span>
        {a.reference}
      </div>
      <PageHeading
        title={type?.name ?? "Appointment"}
        description={`${dateLabel(a.date)} · ${a.time} SAST`}
        action={<Badge status={a.status} />}
      />
      <Notice error={action.error} success={action.success} />
      <div className="details-grid">
        <section className="panel">
          <h2>Your appointment, at a glance.</h2>
          <div className="review-list">
            <div>
              <span>Patient</span>
              <strong>{p?.name}</strong>
            </div>
            <div>
              <span>Dentist</span>
              <strong>{dentist?.name}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{a.duration} minutes</strong>
            </div>
            <div>
              <span>Booking reference</span>
              <strong>{a.reference}</strong>
            </div>
            <div>
              <span>Practice location</span>
              <strong>
                {s.content.address}, {s.content.city}
              </strong>
            </div>
            <div>
              <span>Booking source</span>
              <strong>{a.source}</strong>
            </div>
            <div>
              <span>Payment status</span>
              <Badge status={a.paymentStatus} />
            </div>
          </div>
          {staff && (
            <div className="contact-inline">
              <h3>Patient contact</h3>
              <a href={`tel:${p?.phone}`}>
                <Phone size={16} />
                {p?.phone}
              </a>
              <a href={`mailto:${p?.email}`}>{p?.email}</a>
            </div>
          )}
          <div className="preparation">
            <ShieldCheck size={21} />
            <div>
              <strong>Before your visit</strong>
              <p>{s.content.preparation}</p>
            </div>
          </div>
          {clinical ? (
            <div className="intake-detail">
              <h3>Demonstration intake</h3>
              <p>
                <strong>Reason:</strong>{" "}
                {a.intake.reason || "No intake information supplied."}
              </p>
              <p>
                <strong>Visit preferences:</strong>{" "}
                {a.intake.accessibility || "None supplied."}
              </p>
              {a.documents.map((d) => (
                <p key={d.id}>
                  <FileText size={15} />
                  {d.name} · metadata only
                </p>
              ))}
            </div>
          ) : (
            <div className="notice">
              <ShieldCheck size={18} />
              Clinical intake is restricted to the patient, dentist and
              administrator demo views.
            </div>
          )}
          <div className="row wrap">
            {!closed && a.status !== "Awaiting payment" && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setDialog("reschedule")}
                >
                  <Pencil size={16} />
                  Reschedule
                </Button>
                <Button variant="danger" onClick={() => setDialog("cancel")}>
                  Cancel appointment
                </Button>
              </>
            )}
            {staff && !closed && a.status !== "Awaiting payment" && (
              <Field label="Update status">
                <select
                  value={a.status}
                  onChange={(e) =>
                    action.run(
                      () =>
                        bookingService.updateStatus(
                          a.id,
                          e.target.value as Appointment["status"],
                        ),
                      "Status updated.",
                    )
                  }
                >
                  <option>Confirmed</option>
                  <option>Checked in</option>
                  <option>Completed</option>
                  <option>No-show</option>
                </select>
              </Field>
            )}
          </div>
        </section>
        <aside>
          <section className="panel">
            <CreditCard size={29} className="text-teal" />
            <h2>Payment summary</h2>
            <div className="summary-fee">
              <span>Sample consultation fee</span>
              <strong>{money(a.fee)}</strong>
            </div>
            <div className="summary-fee">
              <span>Demo amount recorded</span>
              <strong>{money(a.paid)}</strong>
            </div>
            <div className="summary-fee">
              <span>Sample outstanding balance</span>
              <strong>{money(Math.max(0, a.fee - a.paid))}</strong>
            </div>
            {!staff && (
              <LinkButton
                to={`/portal/payments?appointment=${a.id}`}
                variant="secondary"
              >
                Payments & receipts <ArrowRight size={16} />
              </LinkButton>
            )}
            {canMoney && (
              <>
                <Field label="Record a demo payment (R)">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(0, a.fee - a.paid)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                  />
                </Field>
                <Button
                  disabled={action.busy || !amount || a.status === "Cancelled"}
                  onClick={async () => {
                    const result = await action.run(
                      () => bookingService.recordPayment(a.id, Number(amount)),
                      "Demo payment recorded.",
                    );
                    if (result) setAmount("");
                  }}
                >
                  Record demo payment
                </Button>
                {a.paid > 0 && (
                  <Button variant="ghost" onClick={() => setDialog("refund")}>
                    Simulate a refund
                  </Button>
                )}
              </>
            )}
            {a.status === "Awaiting payment" && (
              <div className="checkout-resume">
                <p>
                  Temporary hold expires at{" "}
                  {a.holdExpires &&
                    new Date(a.holdExpires).toLocaleTimeString("en-ZA", {
                      timeZone: "Africa/Johannesburg",
                    })}{" "}
                  SAST.
                </p>
                <Field label="Demo payment outcome">
                  <select
                    value={outcome}
                    onChange={(e) =>
                      setOutcome(e.target.value as typeof outcome)
                    }
                  >
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="expired">Expired reservation</option>
                  </select>
                </Field>
                <Button
                  disabled={action.busy}
                  onClick={() =>
                    action.run(
                      () => bookingService.completePayment(a.id, outcome),
                      "Demo payment state updated.",
                    )
                  }
                >
                  Complete demo payment
                </Button>
                <small>No real card information is collected.</small>
              </div>
            )}
          </section>
          <section className="panel">
            <h3>Need to make a change?</h3>
            <p>{s.content.policy}</p>
            <Link to="/contact" className="text-link">
              Contact reception <ArrowRight size={16} />
            </Link>
          </section>
        </aside>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === "cancel"
              ? "Cancel this appointment?"
              : dialog === "refund"
                ? "Simulate a full refund?"
                : "Choose a new time"
          }
          onClose={close}
        >
          <Notice error={action.error} />
          {dialog === "reschedule" ? (
            <>
              <p>Your booking reference and demo payment are preserved.</p>
              <Field label="New appointment date">
                <input
                  type="date"
                  value={date}
                  min={today()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime("");
                  }}
                />
              </Field>
              <Field label="Available time (SAST)">
                <select value={time} onChange={(e) => setTime(e.target.value)}>
                  <option value="">Choose a time</option>
                  {available
                    .filter((x) => x.available)
                    .map((slot) => (
                      <option key={slot.time}>{slot.time}</option>
                    ))}
                </select>
              </Field>
              {date && !available.some((x) => x.available) && (
                <p>
                  No suitable slots. Choose another date or contact reception.
                </p>
              )}
            </>
          ) : (
            <p>
              {dialog === "cancel"
                ? "Your slot will be released. Paid demonstration deposits can be reviewed by reception."
                : "This records a fictional refund of " +
                  money(a.paid) +
                  ". No real money will move."}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={close}>
              Keep appointment
            </Button>
            <Button
              variant={dialog === "cancel" ? "danger" : "primary"}
              disabled={action.busy || (dialog === "reschedule" && !time)}
              onClick={changeBooking}
            >
              {action.busy
                ? "Updating…"
                : dialog === "cancel"
                  ? "Confirm cancellation"
                  : dialog === "refund"
                    ? "Confirm demo refund"
                    : "Save new time"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function PatientProfile() {
  const { patient } = usePatient(),
    action = useAction();
  const [form, setForm] = useState({
    name: patient?.name ?? "",
    email: patient?.email ?? "",
    phone: patient?.phone ?? "",
    birthDate: patient?.birthDate ?? "",
  });
  return (
    <>
      <PageHeading
        title="My profile"
        description="Keep your fictional contact details ready for your next visit."
      />
      <Notice error={action.error} success={action.success} />
      <section className="panel narrow-panel">
        <div className="profile-intro">
          <div className="avatar large">
            {patient?.name
              .split(" ")
              .slice(0, 2)
              .map((x) => x[0])
              .join("")}
          </div>
          <div>
            <h2>Your details</h2>
            <p>Demonstration profile · editable in this browser</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            action.run(() => patientService.update(form), "Profile saved.");
          }}
        >
          {(["name", "email", "phone", "birthDate"] as const).map((key) => (
            <Field
              key={key}
              label={
                {
                  name: "Full name",
                  email: "Email address",
                  phone: "Phone number",
                  birthDate: "Date of birth (optional)",
                }[key]
              }
            >
              <input
                type={
                  key === "birthDate"
                    ? "date"
                    : key === "email"
                      ? "email"
                      : key === "phone"
                        ? "tel"
                        : "text"
                }
                value={form[key]}
                max={key === "birthDate" ? today() : undefined}
                required={key !== "birthDate"}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          <div className="form-full">
            <Button disabled={action.busy}>
              {action.busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
export function PatientDocuments() {
  const { patient } = usePatient(),
    action = useAction(),
    [documents, setDocuments] = useState<DemoDocument[]>(
      patient?.documents ?? [],
    );
  return (
    <>
      <PageHeading
        title="Intake & documents"
        description="Get ready for your visit with fictional demonstration files."
      />
      <Notice error={action.error} success={action.success} />
      <section className="panel narrow-panel">
        <div className="notice">
          <ShieldCheck size={19} />
          Do not select real identity documents or medical records. File
          contents are never uploaded or stored.
        </div>
        <DocumentUploader documents={documents} onChange={setDocuments} />
        <Button
          disabled={action.busy}
          onClick={() =>
            action.run(
              () => patientService.documents(documents),
              "Document metadata saved.",
            )
          }
        >
          Save demonstration documents
        </Button>
        <p className="small muted">
          Appointment-specific intake is completed in the booking flow and
          appears on your appointment details page.
        </p>
      </section>
    </>
  );
}
export function PatientNotifications() {
  const { state: s, patient } = usePatient(),
    action = useAction();
  const [preferences, setPreferences] = useState(
    patient?.preferences ?? { email: true, sms: false, reminders: true },
  );
  return (
    <>
      <PageHeading
        title="Notifications"
        description="A little clarity about your visits, and how you’d like to hear from us."
      />
      <Notice error={action.error} success={action.success} />
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Your updates</h2>
          {s.notifications
            .filter((n) => n.patientId === patient?.id)
            .map((n) => (
              <article
                className={`notification-row ${n.read ? "read" : ""}`}
                key={n.id}
              >
                <div className="round-icon">
                  <Bell size={20} />
                </div>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>
                    {new Date(n.createdAt).toLocaleString("en-ZA", {
                      timeZone: "Africa/Johannesburg",
                    })}{" "}
                    SAST
                  </small>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        action.run(() => patientService.markRead(n.id))
                      }
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          {!s.notifications.some((n) => n.patientId === patient?.id) && (
            <Empty
              title="You’re all caught up"
              description="Appointment confirmations and changes will appear here."
            />
          )}
        </section>
        <section className="panel">
          <h2>How should we keep you updated?</h2>
          <p>
            Preferences are saved locally. No email or SMS messages leave this
            demonstration.
          </p>
          {(["email", "sms", "reminders"] as const).map((key) => (
            <label className="toggle-row" key={key}>
              <div>
                <strong>
                  {
                    {
                      email: "Email updates",
                      sms: "SMS updates",
                      reminders: "Appointment reminders",
                    }[key]
                  }
                </strong>
                <small>
                  {
                    {
                      email: "Confirmations and booking changes",
                      sms: "Short appointment notices",
                      reminders: "A reminder before your next visit",
                    }[key]
                  }
                </small>
              </div>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(e) =>
                  setPreferences({ ...preferences, [key]: e.target.checked })
                }
              />
            </label>
          ))}
          <Button
            onClick={() =>
              action.run(
                () => patientService.preferences(preferences),
                "Notification preferences saved.",
              )
            }
            disabled={action.busy}
          >
            Save preferences
          </Button>
          <div className="notice">
            <CalendarDays size={19} />
            Upcoming appointment details represent your demonstration reminder.
            Live delivery connects through a notification adapter.
          </div>
        </section>
      </div>
    </>
  );
}
export function PatientPayments() {
  const { state: s, patient } = usePatient(),
    [query] = useSearchParams(),
    [receipt, setReceipt] = useState<string | null>(query.get("appointment"));
  const appointments = s.appointments.filter(
      (a) => a.patientId === patient?.id,
    ),
    payments = s.payments.filter((p) =>
      appointments.some((a) => a.id === p.appointmentId),
    ),
    selected = appointments.find((a) => a.id === receipt),
    paid = payments
      .filter((p) => p.status === "Recorded")
      .reduce((sum, p) => sum + p.amount, 0),
    refunded = payments
      .filter((p) => p.status === "Refunded")
      .reduce((sum, p) => sum + p.amount, 0);
  return (
    <>
      <PageHeading
        title="Payments & receipts"
        description="Sample fees and fictional transactions. No real payments have been processed."
      />
      <Stats
        items={[
          { label: "Demo payments recorded", value: money(paid) },
          { label: "Demo refunds", value: money(refunded) },
          {
            label: "Sample outstanding balances",
            value: money(
              appointments
                .filter((a) => a.status !== "Cancelled")
                .reduce((sum, a) => sum + Math.max(0, a.fee - a.paid), 0),
            ),
          },
        ]}
      />
      <section className="panel">
        <div className="section-label">
          <h2>Your payment records</h2>
          <span className="badge neutral">Demonstration only</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Date</th>
                <th>Sample fee</th>
                <th>Recorded</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>
                      {
                        s.consultations.find((t) => t.id === a.consultationId)
                          ?.name
                      }
                    </strong>
                    <small>{a.reference}</small>
                  </td>
                  <td>{dateLabel(a.date, true)}</td>
                  <td>{money(a.fee)}</td>
                  <td>{money(a.paid)}</td>
                  <td>
                    <Badge status={a.paymentStatus} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setReceipt(a.id)}>
                      <FileText size={16} />
                      View statement
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!appointments.length && (
          <Empty
            title="No payment records yet"
            description="Demo receipts appear after you book and complete a simulated payment."
          />
        )}
      </section>
      {selected && (
        <Modal
          title="Demonstration payment statement"
          onClose={() => setReceipt(null)}
          wide
        >
          <div className="print-receipt">
            <span className="eyebrow">
              {s.content.name} · NO REAL FUNDS TRANSFERRED
            </span>
            <h2>{selected.reference}</h2>
            <p>
              {patient?.name} ·{" "}
              {
                s.consultations.find((t) => t.id === selected.consultationId)
                  ?.name
              }
            </p>
            <p>
              {dateLabel(selected.date, true)} · {selected.time} SAST
            </p>
            <div className="review-list">
              <div>
                <span>Sample fee</span>
                <strong>{money(selected.fee)}</strong>
              </div>
              <div>
                <span>Net demo payment recorded</span>
                <strong>{money(selected.paid)}</strong>
              </div>
            </div>
            <h3>Transactions</h3>
            {payments
              .filter((p) => p.appointmentId === selected.id)
              .map((p) => (
                <div className="receipt-row" key={p.id}>
                  <span>
                    {p.id}
                    <small>
                      {p.method} · {p.date} · {p.status}
                    </small>
                  </span>
                  <strong>
                    {p.status === "Refunded" ? "-" : ""}
                    {money(p.amount)}
                  </strong>
                </div>
              ))}
            {!payments.some((p) => p.appointmentId === selected.id) && (
              <p>No completed demonstration transactions.</p>
            )}
            <p className="small muted">
              This is a fictional receipt and is not evidence of payment for a
              real appointment.
            </p>
          </div>
          <Button className="no-print" onClick={() => window.print()}>
            <Printer size={18} />
            Print / save as PDF
          </Button>
        </Modal>
      )}
    </>
  );
}
