import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type {
  Appointment,
  ConsultationType,
  Role,
  SiteContent,
} from "../domain";
import { useAction, useDemo, useNow } from "../hooks";
import { adminService } from "../services/mock";
import {
  addDays,
  dateLabel,
  dayOfWeek,
  money,
  timestamp,
  today,
} from "../time";
import { AdminOnly, MoneyOnly } from "../components/layout";
import {
  Badge,
  Button,
  Empty,
  Field,
  LinkButton,
  Modal,
  Notice,
  PageHeading,
  SearchInput,
  Stats,
} from "../components/ui";

function useStaff() {
  const s = useDemo(),
    user = s.users.find((u) => u.id === s.sessionUserId),
    dentist = s.dentists.find((d) => d.userId === user?.id);
  return {
    s,
    user,
    appointments: s.appointments.filter(
      (a) => user?.role !== "dentist" || a.dentistId === dentist?.id,
    ),
  };
}
export function StaffOverview() {
  const now = useNow();
  const { s, user, appointments } = useStaff(),
    next = appointments
      .filter(
        (a) =>
          !["Cancelled", "Completed", "No-show"].includes(a.status) &&
          timestamp(a.date, a.time) > now,
      )
      .sort((a, b) => timestamp(a.date, a.time) - timestamp(b.date, b.time));
  return (
    <>
      <PageHeading
        eyebrow={
          user?.role === "dentist"
            ? "YOUR DENTIST VIEW"
            : "YOUR PRACTICE, AT A GLANCE"
        }
        title={`Good day, ${user?.name.replace("Dr ", "").split(" ")[0]}.`}
        description={
          user?.role === "dentist"
            ? "Your upcoming consultations and authorised demonstration intake."
            : "A clear picture of your appointments, patients and daily workflow."
        }
        action={
          <LinkButton to="/staff/book">
            <Plus size={17} />
            New appointment
          </LinkButton>
        }
      />
      <Stats
        items={[
          {
            label: "Appointments today",
            value: appointments.filter(
              (a) => a.date === today() && a.status !== "Cancelled",
            ).length,
          },
          { label: "Upcoming appointments", value: next.length },
          {
            label: "Awaiting payment",
            value: appointments.filter((a) => a.status === "Awaiting payment")
              .length,
          },
          {
            label: "Patients in this view",
            value: new Set(appointments.map((a) => a.patientId)).size,
          },
        ]}
      />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-label">
            <h2>Next appointments</h2>
            <Link to="/staff/calendar" className="text-link">
              Open calendar <ArrowRight size={16} />
            </Link>
          </div>
          {next.slice(0, 5).map((a) => (
            <Link
              className="schedule-row"
              key={a.id}
              to={`/staff/appointments/${a.id}`}
            >
              <div className="schedule-time">
                <strong>{a.time}</strong>
                <small>{dateLabel(a.date, true)}</small>
              </div>
              <div>
                <strong>
                  {s.patients.find((p) => p.id === a.patientId)?.name}
                </strong>
                <p>
                  {s.consultations.find((c) => c.id === a.consultationId)?.name}
                </p>
                <small>
                  {s.dentists.find((d) => d.id === a.dentistId)?.name}
                </small>
              </div>
              <Badge status={a.status} />
              <ChevronRight size={18} />
            </Link>
          ))}
          {!next.length && (
            <Empty
              title="Your schedule is clear"
              description="New demonstration bookings appear here and in the shared calendar."
            />
          )}
        </section>
        <section className="panel mint-panel">
          <ShieldCheck size={29} />
          <h2>A view for every role.</h2>
          <p>
            {user?.role === "dentist"
              ? "Your dentist account sees its own appointments, patient contacts and fictional clinical intake."
              : user?.role === "receptionist"
                ? "Reception has booking, contact and payment tools. Fictional clinical intake is restricted to dentist and administrator views."
                : "Administrators can manage the team, fees, website content and practice availability."}
          </p>
          <div className="quick-links">
            <Link to="/staff/calendar">
              <CalendarDays size={18} />
              Calendar <ArrowRight size={15} />
            </Link>
            <Link to="/staff/patients">
              <UsersRound size={18} />
              Patient lookup <ArrowRight size={15} />
            </Link>
            {user?.role === "administrator" && (
              <Link to="/staff/content">
                Website content <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Shared availability, fewer surprises.</h2>
        <p>
          Patient and reception bookings use the same demonstration slots.
          Checkout reservations hold a slot temporarily, and expired or
          cancelled bookings release it again.
        </p>
        <Link to="/staff/calendar" className="text-link">
          Explore the appointment calendar <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
export function StaffCalendar() {
  const { s, user, appointments } = useStaff(),
    [date, setDate] = useState(today()),
    [view, setView] = useState<"day" | "week" | "month" | "list">("week"),
    [dentistId, setDentistId] = useState("all"),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all"),
    [q, setQ] = useState("");
  let start = date,
    end = addDays(date, 1);
  if (view === "week") {
    start = addDays(date, -((dayOfWeek(date) + 6) % 7));
    end = addDays(start, 7);
  }
  if (view === "month") {
    start = date.slice(0, 7) + "-01";
    const d = new Date(start + "T12:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    end = d.toISOString().slice(0, 10);
  }
  if (view === "list") end = addDays(date, 30);
  const days = Array.from(
    {
      length:
        view === "month"
          ? Math.round(
              (new Date(end).getTime() - new Date(start).getTime()) / 86400000,
            )
          : view === "week"
            ? 7
            : 1,
    },
    (_, i) => addDays(start, i),
  );
  const filtered = appointments
    .filter(
      (a) =>
        a.date >= start &&
        a.date < end &&
        (dentistId === "all" || a.dentistId === dentistId) &&
        (type === "all" || a.consultationId === type) &&
        (status === "all" || a.status === status) &&
        (s.patients.find((p) => p.id === a.patientId)?.name + " " + a.reference)
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => timestamp(a.date, a.time) - timestamp(b.date, b.time));
  const statuses = [
    "Awaiting approval",
    "Awaiting payment",
    "Confirmed",
    "Checked in",
    "Completed",
    "Cancelled",
    "No-show",
  ];
  function move(direction: number) {
    if (view === "month") {
      const d = new Date(date + "T12:00Z");
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(addDays(date, direction * (view === "week" ? 7 : 1)));
  }
  return (
    <>
      <PageHeading
        title="Appointment calendar"
        description="A shared schedule for patient, telephone and reception bookings. All times are SAST."
        action={
          <LinkButton to="/staff/book">
            <Plus size={17} />
            New appointment
          </LinkButton>
        }
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div className="row">
            <Button
              variant="ghost"
              aria-label="Previous calendar period"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={19} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Next calendar period"
              onClick={() => move(1)}
            >
              <ChevronRight size={19} />
            </Button>
            <h2>{dateLabel(start, true)}</h2>
            <Button variant="secondary" onClick={() => setDate(today())}>
              Today
            </Button>
          </div>
          <div className="tabs">
            {(["day", "week", "month", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={view === v ? "active" : ""}
                aria-pressed={view === v}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="calendar-filters">
          <Field label="Selected date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || today())}
            />
          </Field>
          {user?.role !== "dentist" && (
            <Field label="Dentist">
              <select
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
              >
                <option value="all">All dentists</option>
                {s.dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Consultation">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All consultation types</option>
              {s.consultations.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Patient or reference"
          />
        </div>
        {view === "list" ? (
          <AppointmentTable items={filtered} />
        ) : (
          <div className="calendar-scroll">
            <div className={`calendar-view ${view}`}>
              {days.map((day) => (
                <section
                  className={`calendar-column ${day === today() ? "today" : ""}`}
                  key={day}
                >
                  <div className="calendar-day-heading">
                    <small>
                      {new Date(day + "T12:00Z").toLocaleDateString("en-ZA", {
                        weekday: "short",
                      })}
                    </small>
                    <strong>{day.slice(-2)}</strong>
                    <span>
                      {filtered.filter((a) => a.date === day).length}{" "}
                      appointments
                    </span>
                  </div>
                  <div className="calendar-events">
                    {filtered
                      .filter((a) => a.date === day)
                      .map((a) => (
                        <Link
                          key={a.id}
                          className={`calendar-event ${a.status === "Cancelled" ? "cancelled" : ""}`}
                          to={`/staff/appointments/${a.id}`}
                        >
                          <strong>
                            {a.time} ·{" "}
                            {s.patients.find((p) => p.id === a.patientId)?.name}
                          </strong>
                          <span>
                            {
                              s.consultations.find(
                                (t) => t.id === a.consultationId,
                              )?.name
                            }
                          </span>
                          <small>
                            {s.dentists.find((d) => d.id === a.dentistId)?.name}
                          </small>
                          <Badge status={a.status} />
                        </Link>
                      ))}
                    {!filtered.some((a) => a.date === day) && (
                      <span className="empty-day">No appointments</span>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
        <div className="calendar-bottom">
          <span>{filtered.length} appointments in this view</span>
          <span>South African time · UTC+2</span>
        </div>
      </section>
    </>
  );
}
function AppointmentTable({ items }: { items: Appointment[] }) {
  const s = useDemo();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Date & time</th>
            <th>Consultation</th>
            <th>Dentist</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>
                  {s.patients.find((p) => p.id === a.patientId)?.name}
                </strong>
                <small>{a.reference}</small>
              </td>
              <td>
                {dateLabel(a.date, true)}
                <small>{a.time} SAST</small>
              </td>
              <td>
                {s.consultations.find((t) => t.id === a.consultationId)?.name}
              </td>
              <td>{s.dentists.find((d) => d.id === a.dentistId)?.name}</td>
              <td>
                <Badge status={a.status} />
              </td>
              <td>
                <Link to={`/staff/appointments/${a.id}`} className="text-link">
                  Open <ArrowRight size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <Empty
          title="No matching appointments"
          description="Try another date or adjust your filters."
        />
      )}
    </div>
  );
}
export function StaffPatients() {
  const { s, user, appointments } = useStaff(),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<string>();
  const patients = s.patients.filter(
      (p) =>
        (user?.role !== "dentist" ||
          appointments.some((a) => a.patientId === p.id)) &&
        (p.name + " " + p.email + " " + p.phone)
          .toLowerCase()
          .includes(q.toLowerCase()),
    ),
    patient = s.patients.find((p) => p.id === selected),
    clinical = user?.role === "dentist" || user?.role === "administrator";
  return (
    <>
      <PageHeading
        title="Patient search"
        description="Find fictional patient contacts and appointment details authorised for your demo role."
        action={
          <LinkButton to="/staff/book">
            <Plus size={17} />
            Create a booking
          </LinkButton>
        }
      />
      <section className="panel">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by name, email or phone"
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Appointments</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="row">
                      <span className="avatar small">
                        {p.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>
                    {appointments.filter((a) => a.patientId === p.id).length}
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setSelected(p.id)}>
                      View patient <ArrowRight size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!patients.length && (
          <Empty
            title="No matching patients"
            description="Try a name, phone number or email address."
          />
        )}
      </section>
      {patient && (
        <Modal
          title={patient.name + " · fictional patient"}
          onClose={() => setSelected(undefined)}
          wide
        >
          <div className="review-list">
            <div>
              <span>Email</span>
              <strong>{patient.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{patient.phone}</strong>
            </div>
          </div>
          <h3>Appointments</h3>
          {appointments
            .filter((a) => a.patientId === patient.id)
            .map((a) => (
              <div className="patient-booking" key={a.id}>
                <Link
                  to={`/staff/appointments/${a.id}`}
                  onClick={() => setSelected(undefined)}
                >
                  <strong>
                    {dateLabel(a.date, true)} · {a.time} SAST
                  </strong>
                  <span>
                    {
                      s.consultations.find((t) => t.id === a.consultationId)
                        ?.name
                    }
                  </span>
                </Link>
                <Badge status={a.status} />
                {clinical && (
                  <p className="small">
                    Fictional intake: {a.intake.reason || "Not supplied"}
                  </p>
                )}
              </div>
            ))}
          {!clinical && (
            <div className="notice">
              <ShieldCheck size={18} />
              Reception sees contact and booking data; clinical intake is
              restricted.
            </div>
          )}
          <div className="modal-actions">
            <LinkButton to={`/staff/book?patient=${patient.id}`}>
              Create appointment
            </LinkButton>
            <Button variant="secondary" onClick={() => setSelected(undefined)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function StaffAvailability() {
  return (
    <AdminOnly>
      <AvailabilityEditor />
    </AdminOnly>
  );
}
function AvailabilityEditor() {
  const s = useDemo(),
    action = useAction(),
    [dentistId, setDentistId] = useState(s.dentists[0].id),
    [working, setWorking] = useState(structuredClone(s.availability[0])),
    [block, setBlock] = useState({
      date: today(),
      endDate: today(),
      start: "09:00",
      end: "10:00",
      reason: "",
    }),
    [remove, setRemove] = useState<string>();
  function choose(id: string) {
    setDentistId(id);
    const row = s.availability.find((a) => a.dentistId === id);
    if (row) setWorking(structuredClone(row));
  }
  return (
    <>
      <PageHeading
        title="Availability management"
        description="Set working hours, breaks and leave. Changes update the shared booking calendar."
      />
      <Notice error={action.error} success={action.success} />
      <Field label="Dentist">
        <select value={dentistId} onChange={(e) => choose(e.target.value)}>
          {s.dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Working hours</h2>
          <div className="weekday-checks">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (label, i) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={working.weekdays.includes(i)}
                    onChange={(e) =>
                      setWorking({
                        ...working,
                        weekdays: e.target.checked
                          ? [...working.weekdays, i]
                          : working.weekdays.filter((d) => d !== i),
                      })
                    }
                  />
                  {label}
                </label>
              ),
            )}
          </div>
          <div className="form-grid">
            <Field label="Start time (SAST)">
              <input
                type="time"
                value={working.start}
                onChange={(e) =>
                  setWorking({ ...working, start: e.target.value })
                }
              />
            </Field>
            <Field label="End time (SAST)">
              <input
                type="time"
                value={working.end}
                onChange={(e) =>
                  setWorking({ ...working, end: e.target.value })
                }
              />
            </Field>
          </div>
          <p className="small muted">
            Saturday hours are capped at 13:00 in the demo. Changes affect
            future availability; existing bookings remain visible.
          </p>
          <Button
            disabled={action.busy}
            onClick={() =>
              action.run(
                () => adminService.availability({ ...working, dentistId }),
                "Working hours saved.",
              )
            }
          >
            Save working hours
          </Button>
        </section>
        <section className="panel">
          <h2>Add a break, leave or blocked date</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(
                () => adminService.block({ ...block, dentistId }),
                "Unavailable period added.",
              );
            }}
            className="form-grid"
          >
            <Field label="From date">
              <input
                type="date"
                min={today()}
                value={block.date}
                onChange={(e) =>
                  setBlock({
                    ...block,
                    date: e.target.value,
                    endDate:
                      e.target.value > block.endDate
                        ? e.target.value
                        : block.endDate,
                  })
                }
                required
              />
            </Field>
            <Field label="Through date">
              <input
                type="date"
                min={block.date}
                value={block.endDate}
                onChange={(e) =>
                  setBlock({ ...block, endDate: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Start time">
              <input
                type="time"
                value={block.start}
                onChange={(e) => setBlock({ ...block, start: e.target.value })}
                required
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={block.end}
                onChange={(e) => setBlock({ ...block, end: e.target.value })}
                required
              />
            </Field>
            <div className="form-full">
              <Field label="Reason">
                <input
                  value={block.reason}
                  placeholder="Lunch break, leave, training…"
                  onChange={(e) =>
                    setBlock({ ...block, reason: e.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <div className="form-full">
              <Button disabled={action.busy}>Block availability</Button>
            </div>
          </form>
          <p className="small muted">
            To block a period with existing bookings, reschedule or cancel those
            appointments first.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Unavailable periods</h2>
        {s.blocks
          .filter((b) => b.dentistId === dentistId)
          .map((b) => (
            <div className="setting-row" key={b.id}>
              <div>
                <strong>{b.reason}</strong>
                <p>
                  {b.date} – {b.endDate} · {b.start}–{b.end} SAST
                </p>
              </div>
              <Button variant="ghost" onClick={() => setRemove(b.id)}>
                Remove
              </Button>
            </div>
          ))}
      </section>
      {remove && (
        <Modal
          title="Remove this unavailable period?"
          onClose={() => setRemove(undefined)}
        >
          <p>
            This will make the affected times available again where no other
            bookings or restrictions apply.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRemove(undefined)}>
              Keep period
            </Button>
            <Button
              disabled={action.busy}
              onClick={async () => {
                await action.run(
                  () => adminService.removeBlock(remove),
                  "Unavailable period removed.",
                );
                setRemove(undefined);
              }}
            >
              Remove period
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function StaffConsultations() {
  return (
    <AdminOnly>
      <ConsultationEditor />
    </AdminOnly>
  );
}
function ConsultationEditor() {
  const s = useDemo(),
    action = useAction(),
    [edit, setEdit] = useState<ConsultationType>();
  return (
    <>
      <PageHeading
        title="Consultations & sample fees"
        description="Configure duration, fees and demo deposits. Patients book consultations; staff schedule treatment visits."
      />
      <Notice error={action.error} success={action.success} />
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Consultation</th>
                <th>Duration</th>
                <th>Sample fee</th>
                <th>Deposit</th>
                <th>Booking access</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {s.consultations.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.enabled ? "Enabled" : "Disabled"}</small>
                  </td>
                  <td>{c.duration} min</td>
                  <td>{money(c.fee)}</td>
                  <td>{money(c.deposit)}</td>
                  <td>
                    {c.patientBookable ? "Patient & staff" : "Staff only"}
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setEdit({ ...c })}>
                      Edit settings
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Published dental services</h2>
        <p>
          Show only the services offered by the practice. All service copy and
          educational assets require approval before a real launch.
        </p>
        {s.services.map((service) => (
          <label className="toggle-row" key={service.id}>
            <div>
              <strong>{service.name}</strong>
              <small>{service.group}</small>
            </div>
            <input
              type="checkbox"
              checked={service.enabled}
              disabled={action.busy}
              onChange={() =>
                action.run(
                  () => adminService.toggleService(service.id),
                  "Service visibility updated.",
                )
              }
            />
          </label>
        ))}
      </section>
      {edit && (
        <Modal
          title="Edit consultation settings"
          onClose={() => setEdit(undefined)}
        >
          <Notice error={action.error} />
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const saved = await action.run(
                () => adminService.consultation(edit).then(() => true),
                "Consultation settings saved.",
              );
              if (saved) setEdit(undefined);
            }}
          >
            <Field label="Consultation name">
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                value={edit.duration}
                onChange={(e) =>
                  setEdit({ ...edit, duration: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field label="Sample fee (R)">
              <input
                type="number"
                min="0"
                value={edit.fee}
                step="0.01"
                onChange={(e) =>
                  setEdit({ ...edit, fee: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field label="Demo deposit (R)">
              <input
                type="number"
                min="0"
                max={edit.fee}
                value={edit.deposit}
                step="0.01"
                onChange={(e) =>
                  setEdit({ ...edit, deposit: Number(e.target.value) })
                }
                required
              />
            </Field>
            <label className="check-field">
              <input
                type="checkbox"
                checked={edit.enabled}
                onChange={(e) =>
                  setEdit({ ...edit, enabled: e.target.checked })
                }
              />
              Enabled
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={edit.patientBookable}
                onChange={(e) =>
                  setEdit({ ...edit, patientBookable: e.target.checked })
                }
              />
              Patients can book this consultation directly
            </label>
            <Button disabled={action.busy}>Save settings</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function StaffContent() {
  return (
    <AdminOnly>
      <ContentEditor />
    </AdminOnly>
  );
}
function ContentEditor() {
  const s = useDemo(),
    action = useAction(),
    [content, setContent] = useState<SiteContent>(structuredClone(s.content));
  return (
    <>
      <PageHeading
        title="Website content"
        description="Make the demo your own. Public pages update when you publish your changes."
        action={
          <LinkButton to="/" variant="secondary">
            View website <ArrowRight size={17} />
          </LinkButton>
        }
      />
      <Notice error={action.error} success={action.success} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(
            () => adminService.content(content),
            "Website content published.",
          );
        }}
      >
        <div className="dashboard-grid">
          <section className="panel form-stack">
            <h2>Practice & contact</h2>
            {(
              [
                "name",
                "tagline",
                "phone",
                "email",
                "address",
                "city",
                "hours",
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={
                  {
                    name: "Practice name",
                    tagline: "Tagline",
                    phone: "Phone",
                    email: "Email",
                    address: "Street address",
                    city: "City / region",
                    hours: "Opening hours text",
                  }[key]
                }
              >
                <input
                  type={key === "email" ? "email" : "text"}
                  value={content[key]}
                  onChange={(e) =>
                    setContent({ ...content, [key]: e.target.value })
                  }
                  required
                />
              </Field>
            ))}
          </section>
          <section className="panel form-stack">
            <h2>Homepage & visit information</h2>
            <Field label="Homepage headline">
              <input
                value={content.heroHeadline}
                onChange={(e) =>
                  setContent({ ...content, heroHeadline: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Homepage supporting text">
              <textarea
                rows={4}
                value={content.heroCopy}
                onChange={(e) =>
                  setContent({ ...content, heroCopy: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Preparation information (sample copy)">
              <textarea
                rows={4}
                value={content.preparation}
                onChange={(e) =>
                  setContent({ ...content, preparation: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Online change deadline (hours)">
              <input
                type="number"
                min="0"
                max="168"
                value={content.cancellationHours}
                onChange={(e) =>
                  setContent({
                    ...content,
                    cancellationHours: Number(e.target.value),
                  })
                }
                required
              />
            </Field>
          </section>
        </div>
        <section className="panel form-stack">
          <h2>Policies & frequently asked questions</h2>
          <Field label="Booking and refund policy">
            <textarea
              rows={4}
              value={content.policy}
              onChange={(e) =>
                setContent({ ...content, policy: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Privacy notice">
            <textarea
              rows={4}
              value={content.privacy}
              onChange={(e) =>
                setContent({ ...content, privacy: e.target.value })
              }
              required
            />
          </Field>
          {content.faqs.map((faq, i) => (
            <div className="form-grid faq-edit" key={i}>
              <Field label={`Question ${i + 1}`}>
                <input
                  value={faq.question}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      faqs: content.faqs.map((f, j) =>
                        j === i ? { ...f, question: e.target.value } : f,
                      ),
                    })
                  }
                  required
                />
              </Field>
              <Field label={`Answer ${i + 1}`}>
                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      faqs: content.faqs.map((f, j) =>
                        j === i ? { ...f, answer: e.target.value } : f,
                      ),
                    })
                  }
                  required
                />
              </Field>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setContent({
                ...content,
                faqs: [...content.faqs, { question: "", answer: "" }],
              })
            }
          >
            Add FAQ
          </Button>
        </section>
        <Button disabled={action.busy}>
          {action.busy ? "Publishing…" : "Publish demonstration content"}
        </Button>
      </form>
    </>
  );
}
export function StaffTeam() {
  return (
    <AdminOnly>
      <TeamEditor />
    </AdminOnly>
  );
}
function TeamEditor() {
  const [roleEdit, setRoleEdit] = useState<{
    id: string;
    role: Exclude<Role, "patient">;
  }>();
  const s = useDemo(),
    action = useAction(),
    [form, setForm] = useState({
      name: "",
      email: "",
      role: "receptionist" as Role,
    });
  return (
    <>
      <PageHeading
        title="Staff & roles"
        description="Fictional staff accounts with role-specific navigation and views."
      />
      <Notice error={action.error} success={action.success} />
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {s.users
                .filter((u) => u.role !== "patient")
                .map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td className="capitalize">
                      {u.role}
                      <Button
                        variant="ghost"
                        disabled={u.id === s.sessionUserId}
                        onClick={() =>
                          setRoleEdit({
                            id: u.id,
                            role: u.role as Exclude<Role, "patient">,
                          })
                        }
                      >
                        Change role
                      </Button>
                    </td>
                    <td>
                      <Badge status={u.active ? "Confirmed" : "Cancelled"} />
                      <small>
                        {u.active ? "Active account" : "Inactive account"}
                      </small>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        disabled={action.busy || u.id === s.sessionUserId}
                        onClick={() =>
                          action.run(
                            () => adminService.toggleStaff(u.id),
                            "Account status updated.",
                          )
                        }
                      >
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel narrow-panel">
        <h2>Add a fictional staff account</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const saved = await action.run(
              () => adminService.staff(form),
              "Fictional account created. Its demo password is Demo123!.",
            );
            if (saved) setForm({ name: "", email: "", role: "receptionist" });
          }}
        >
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Demo email address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as Role })
              }
            >
              <option value="receptionist">Receptionist</option>
              <option value="dentist">Dentist</option>
              <option value="administrator">Administrator</option>
            </select>
          </Field>
          <p className="small muted">
            Demo password: Demo123!. These local mock accounts must never be
            used for real authentication.
          </p>
          <Button disabled={action.busy}>Create fictional account</Button>
        </form>
      </section>
      {roleEdit && (
        <Modal
          title="Change this fictional staff role?"
          onClose={() => setRoleEdit(undefined)}
        >
          <Notice error={action.error} />
          <p>Navigation and authorised views update to match the new role.</p>
          <Field label="New staff role">
            <select
              value={roleEdit.role}
              onChange={(e) =>
                setRoleEdit({
                  ...roleEdit,
                  role: e.target.value as Exclude<Role, "patient">,
                })
              }
            >
              <option value="receptionist">Receptionist</option>
              <option value="dentist">Dentist</option>
              <option value="administrator">Administrator</option>
            </select>
          </Field>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRoleEdit(undefined)}>
              Keep current role
            </Button>
            <Button
              disabled={action.busy}
              onClick={async () => {
                if (
                  await action.run(
                    () => adminService.role(roleEdit.id, roleEdit.role),
                    "Staff role updated.",
                  )
                )
                  setRoleEdit(undefined);
              }}
            >
              Confirm role change
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function StaffReports() {
  return (
    <MoneyOnly>
      <Reports />
    </MoneyOnly>
  );
}
function Reports() {
  const { s, appointments } = useStaff(),
    [from, setFrom] = useState(addDays(today(), -30)),
    [to, setTo] = useState(addDays(today(), 30));
  const items = appointments.filter((a) => a.date >= from && a.date <= to),
    payments = s.payments.filter((p) => p.date >= from && p.date <= to),
    collected = payments
      .filter((p) => p.status === "Recorded")
      .reduce((n, p) => n + p.amount, 0),
    refunded = payments
      .filter((p) => p.status === "Refunded")
      .reduce((n, p) => n + p.amount, 0),
    statuses = [
      "Confirmed",
      "Awaiting payment",
      "Checked in",
      "Completed",
      "Cancelled",
      "No-show",
    ];
  function download() {
    const csv =
      "Metric,Value\n" +
      [
        ["Appointments", items.length],
        ["Cancellations", items.filter((a) => a.status === "Cancelled").length],
        ["No-shows", items.filter((a) => a.status === "No-show").length],
        ["Demo collected ZAR", collected],
        ["Demo refunded ZAR", refunded],
      ]
        .map((row) => row.join(","))
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "dentalcare-demo-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return (
    <>
      <PageHeading
        title="Practice reports"
        description="Useful information derived directly from the shared fictional records."
        action={
          <Button variant="secondary" onClick={download}>
            Export demo report
          </Button>
        }
      />
      <section className="panel report-filters">
        <Field label="From date">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Through date">
          <input
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </section>
      {to < from ? (
        <Notice error="Choose an end date on or after the start date." />
      ) : (
        <>
          <Stats
            items={[
              { label: "Appointments", value: items.length },
              {
                label: "Cancellations",
                value: items.filter((a) => a.status === "Cancelled").length,
              },
              {
                label: "No-shows",
                value: items.filter((a) => a.status === "No-show").length,
              },
              {
                label: "Net demo collections",
                value: money(collected - refunded),
              },
            ]}
          />
          <div className="dashboard-grid">
            <section className="panel">
              <h2>Booking status breakdown</h2>
              <div className="report-bars">
                {statuses.map((status) => {
                  const n = items.filter((a) => a.status === status).length;
                  return (
                    <div key={status}>
                      <span>{status}</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.max(0, (n / Math.max(1, items.length)) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{n}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <h2>Demonstration payments</h2>
              <div className="review-list">
                <div>
                  <span>Gross demo collections</span>
                  <strong>{money(collected)}</strong>
                </div>
                <div>
                  <span>Demo refunds</span>
                  <strong>{money(refunded)}</strong>
                </div>
                <div>
                  <span>Net recorded</span>
                  <strong>{money(collected - refunded)}</strong>
                </div>
                <div>
                  <span>Sample outstanding fees</span>
                  <strong>
                    {money(
                      items
                        .filter((a) => a.status !== "Cancelled")
                        .reduce((n, a) => n + Math.max(0, a.fee - a.paid), 0),
                    )}
                  </strong>
                </div>
              </div>
              <p className="small muted">
                Booking counts use appointment dates. Transactions use their
                recording dates. All amounts are fictional.
              </p>
            </section>
          </div>
          <section className="panel">
            <h2>Appointments in this report</h2>
            <AppointmentTable items={items} />
          </section>
        </>
      )}
    </>
  );
}
