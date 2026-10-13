import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Appointment, BookingDraft, DemoDocument } from "../domain";
import { useAction, useDemo, useNow } from "../hooks";
import { bookingService, patientService } from "../services/mock";
import { addDays, dateLabel, money, today } from "../time";
import {
  Button,
  DocumentUploader,
  Empty,
  Field,
  LinkButton,
  Notice,
  PageHeading,
  ProgressSteps,
} from "../components/ui";

const steps = [
  "Consultation",
  "Dentist",
  "Date",
  "Time",
  "Your details",
  "Intake",
  "Review",
  "Demo payment",
  "Confirmed",
];
export function BookingWizard({ staff = false }: { staff?: boolean }) {
  const s = useDemo(),
    [query] = useSearchParams(),
    navigate = useNavigate(),
    action = useAction(),
    user = s.users.find((u) => u.id === s.sessionUserId),
    myPatient = s.patients.find((p) => p.userId === user?.id);
  const now = useNow(),
    initialPatient = staff
      ? s.patients.find((p) => p.id === query.get("patient"))
      : myPatient;
  const initialService = s.services.find(
    (x) => x.id === query.get("service") && x.enabled,
  );
  const types = s.consultations.filter(
    (c) => c.enabled && (staff || c.patientBookable),
  );
  const [step, setStep] = useState(0),
    [draft, setDraft] = useState<BookingDraft>({
      patientId: initialPatient?.id ?? s.patients[0]?.id ?? "",
      consultationId:
        query.get("type") && types.some((t) => t.id === query.get("type"))
          ? query.get("type")!
          : (initialService?.consultationId ?? "general"),
      serviceId: initialService?.id ?? "checkups",
      dentistId: query.get("dentist") ?? "d-1",
      date: query.get("date") ?? "",
      time: query.get("time") ?? "",
      intake: { reason: "", accessibility: "", acknowledged: false },
      documents: [],
      source: staff ? "Reception" : "Patient portal",
    });
  const [details, setDetails] = useState({
      name: initialPatient?.name ?? s.patients[0]?.name ?? "",
      email: initialPatient?.email ?? s.patients[0]?.email ?? "",
      phone: initialPatient?.phone ?? s.patients[0]?.phone ?? "",
      birthDate: initialPatient?.birthDate ?? "",
    }),
    [policy, setPolicy] = useState(false),
    [newPatient, setNewPatient] = useState(false),
    [booking, setBooking] = useState<Appointment>(),
    [paymentOutcome, setPaymentOutcome] = useState<
      "success" | "failure" | "expired"
    >("success");
  const type = s.consultations.find((t) => t.id === draft.consultationId),
    dentist = s.dentists.find((d) => d.id === draft.dentistId);
  const liveBooking = booking
    ? s.appointments.find((a) => a.id === booking.id)
    : undefined;
  const slots = draft.date
    ? bookingService.slots(s, draft.date, draft.dentistId, draft.consultationId)
    : [];
  function patch(input: Partial<BookingDraft>) {
    setDraft({ ...draft, ...input });
    action.setError("");
  }
  async function next() {
    action.setError("");
    if (step === 0 && !type) {
      action.setError("Choose a consultation type.");
      return;
    }
    if (step === 1 && !dentist) {
      action.setError("Choose a dentist.");
      return;
    }
    if (step === 2 && (!draft.date || !slots.some((x) => x.available))) {
      action.setError("Choose a date with available appointments.");
      return;
    }
    if (
      step === 3 &&
      !slots.some((x) => x.time === draft.time && x.available)
    ) {
      action.setError("Choose an available time.");
      return;
    }
    if (step === 4) {
      if (
        !details.name.trim() ||
        !/^\S+@\S+\.\S+$/.test(details.email) ||
        details.phone.replace(/\D/g, "").length < 9
      ) {
        action.setError(
          "Enter your name, a valid email address and a phone number with at least nine digits.",
        );
        return;
      }
      if (staff && newPatient) {
        const p = await action.run(() => patientService.add(details));
        if (!p) return;
        setDraft({ ...draft, patientId: p.id });
      } else if (!staff) {
        const p = await action.run(() => patientService.update(details));
        if (!p) return;
      }
    }
    if (
      step === 5 &&
      (!draft.intake.reason.trim() || !draft.intake.acknowledged)
    ) {
      action.setError(
        "Enter a fictional reason for your visit and confirm the demonstration intake notice.",
      );
      return;
    }
    if (step === 6) {
      if (!policy) {
        action.setError(
          "Review and acknowledge the demonstration booking policy.",
        );
        return;
      }
      if (!slots.some((x) => x.time === draft.time && x.available)) {
        action.setError(
          "This slot is no longer available. Go back to choose another time.",
        );
        return;
      }
      const a = await action.run(() => bookingService.reserve(draft));
      if (!a) return;
      setBooking(a);
      setStep(a.status === "Awaiting payment" ? 7 : 8);
      return;
    }
    setStep(Math.min(step + 1, 8));
  }
  async function pay() {
    if (!booking) return;
    const a = await action.run(() =>
      bookingService.completePayment(booking.id, paymentOutcome),
    );
    if (!a) return;
    setBooking(a);
    if (a.status === "Confirmed") setStep(8);
    else if (a.paymentStatus === "Expired")
      action.setError(
        "The demonstration reservation expired and the slot was released. Choose a new appointment time.",
      );
    else
      action.setError(
        "The demonstration payment failed. Your slot is held until the countdown expires; choose success to retry.",
      );
  }
  function restart() {
    setBooking(undefined);
    setStep(2);
    setDraft({ ...draft, date: "", time: "" });
    action.setError("");
    setPolicy(false);
  }
  const remaining = liveBooking?.holdExpires
    ? Math.max(0, Math.ceil((liveBooking.holdExpires - now) / 1000))
    : 0;
  if (!types.length)
    return (
      <Empty
        title="No consultations are currently available"
        description="Contact reception to arrange your appointment."
        action={<LinkButton to="/contact">Contact reception</LinkButton>}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow={staff ? "RECEPTION BOOKING" : "A TIME THAT WORKS FOR YOU"}
        title={step === 8 ? "You’re all booked." : "Book a consultation"}
        description={
          step === 8
            ? "A little peace of mind, one simple booking."
            : "Choose your care, find a time, and review everything before confirming."
        }
      />
      <ProgressSteps labels={steps} current={step} />
      <Notice error={action.error} success={action.success} />
      {step === 8 && liveBooking ? (
        <div className="confirmation">
          <span className="confirmation-icon">
            <CheckCircle2 size={42} />
          </span>
          <span className="eyebrow">APPOINTMENT CONFIRMED</span>
          <h2>We look forward to welcoming you.</h2>
          <p>
            Your fictional appointment is confirmed. No real payment was made.
          </p>
          <div className="confirmation-reference">
            <small>YOUR BOOKING REFERENCE</small>
            <strong>{liveBooking.reference}</strong>
          </div>
          <div className="confirmation-details">
            <h3>{type?.name}</h3>
            <p>{dentist?.name}</p>
            <p>
              <CalendarDays size={17} />
              {dateLabel(liveBooking.date)} · {liveBooking.time} SAST
            </p>
            <p>
              <Clock3 size={17} />
              {liveBooking.duration} minutes
            </p>
            <p>
              <MapPin size={17} />
              {s.content.address}, {s.content.city}
            </p>
            <p>{s.content.preparation}</p>
          </div>
          <div className="row wrap">
            <LinkButton
              to={
                staff
                  ? `/staff/appointments/${liveBooking.id}`
                  : `/portal/appointments/${liveBooking.id}`
              }
            >
              View appointment <ArrowRight size={17} />
            </LinkButton>
            <LinkButton
              to={staff ? "/staff/calendar" : "/portal"}
              variant="secondary"
            >
              Back to my portal
            </LinkButton>
          </div>
        </div>
      ) : (
        <div className="booking-layout">
          <section
            className="panel booking-step"
            aria-labelledby="booking-step-title"
          >
            <span className="eyebrow">STEP {step + 1} OF 9</span>
            <h2 id="booking-step-title">
              {
                [
                  "What can we help you with?",
                  "Who would you like to see?",
                  "Find a day that fits.",
                  "Choose your available time.",
                  "Let’s confirm your details.",
                  "A little preparation.",
                  "Everything look right?",
                  "Complete your demo deposit.",
                ][step]
              }
            </h2>
            {step === 0 && (
              <>
                <p>
                  Book a consultation first. The practice schedules complex
                  treatment following assessment.
                </p>
                <div className="choice-list">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      className={`choice-card ${draft.consultationId === t.id ? "selected" : ""}`}
                      onClick={() =>
                        patch({
                          consultationId: t.id,
                          serviceId:
                            t.id === "child"
                              ? "children"
                              : t.id === "urgent"
                                ? "urgent"
                                : draft.serviceId,
                          time: "",
                        })
                      }
                      aria-pressed={draft.consultationId === t.id}
                    >
                      <span className="radio-circle" />
                      <div>
                        <strong>{t.name}</strong>
                        <small>
                          {t.patientBookable
                            ? "Patient consultation"
                            : "Practice-approved visit · staff scheduling"}
                        </small>
                        <span>
                          {t.duration} min · {money(t.fee)} sample fee
                        </span>
                      </div>
                      <span>
                        {money(t.deposit)}
                        <small>demo deposit</small>
                      </span>
                    </button>
                  ))}
                </div>
                <Field label="What would you like to discuss?">
                  <select
                    value={draft.serviceId}
                    onChange={(e) => patch({ serviceId: e.target.value })}
                  >
                    {s.services
                      .filter((x) => x.enabled)
                      .map((x) => (
                        <option value={x.id} key={x.id}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  All profiles are fictional. Practice-approved professional
                  details will be supplied before launch.
                </p>
                <div className="choice-list">
                  {s.dentists
                    .filter(
                      (d) =>
                        s.users.find((u) => u.id === d.userId)?.active !==
                          false &&
                        (!staff ||
                          user?.role !== "dentist" ||
                          d.userId === user.id),
                    )
                    .map((d) => (
                      <button
                        key={d.id}
                        className={`choice-card ${draft.dentistId === d.id ? "selected" : ""}`}
                        onClick={() =>
                          patch({ dentistId: d.id, date: "", time: "" })
                        }
                        aria-pressed={draft.dentistId === d.id}
                      >
                        <span className={`avatar ${d.colour}`}>
                          {d.initials}
                        </span>
                        <div>
                          <strong>{d.name}</strong>
                          <small>{d.focus}</small>
                          <span>Fictional demo profile</span>
                        </div>
                        <span className="radio-circle" />
                      </button>
                    ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p>
                  Availability is shared with reception. All appointment times
                  are in South African time.
                </p>
                <div className="date-grid">
                  {Array.from({ length: 14 }, (_, i) =>
                    addDays(today(), i + 1),
                  ).map((date) => {
                    const available = bookingService
                      .slots(s, date, draft.dentistId, draft.consultationId)
                      .some((x) => x.available);
                    return (
                      <button
                        key={date}
                        className={`date-option ${draft.date === date ? "selected" : ""}`}
                        disabled={!available}
                        onClick={() => patch({ date, time: "" })}
                        aria-label={`${dateLabel(date)} ${available ? "available" : "unavailable"}`}
                        aria-pressed={draft.date === date}
                      >
                        <small>
                          {new Date(date + "T12:00Z").toLocaleDateString(
                            "en-ZA",
                            { weekday: "short" },
                          )}
                        </small>
                        <strong>{date.slice(-2)}</strong>
                        <small>{available ? "Available" : "Unavailable"}</small>
                      </button>
                    );
                  })}
                </div>
                <Field
                  label="Or choose another date"
                  hint="Days without suitable slots cannot be selected for confirmation."
                >
                  <input
                    type="date"
                    min={today()}
                    max={addDays(today(), 90)}
                    value={draft.date}
                    onChange={(e) => patch({ date: e.target.value, time: "" })}
                  />
                </Field>
                {draft.date && !slots.some((x) => x.available) && (
                  <Empty
                    title="No suitable times on this date"
                    description="Try another day, choose another dentist, or contact reception."
                    action={
                      <LinkButton to="/contact" variant="secondary">
                        <Phone size={16} />
                        Contact reception
                      </LinkButton>
                    }
                  />
                )}
              </>
            )}
            {step === 3 && (
              <>
                <p>
                  {draft.date && dateLabel(draft.date)} · {dentist?.name} ·{" "}
                  {type?.duration} minutes
                </p>
                <div className="time-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      className={draft.time === slot.time ? "selected" : ""}
                      disabled={!slot.available}
                      title={slot.reason || "Available"}
                      onClick={() => patch({ time: slot.time })}
                      aria-pressed={draft.time === slot.time}
                      aria-label={`${slot.time} ${slot.available ? "available" : slot.reason}`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                <div className="slot-legend">
                  <span>
                    <i />
                    Available
                  </span>
                  <span>
                    <i className="unavailable" />
                    Unavailable
                  </span>
                  <span>SAST (UTC+2)</span>
                </div>
                {!slots.some((x) => x.available) && (
                  <Empty
                    title="This date is fully booked"
                    description="Choose another date or contact reception for an alternative."
                    action={
                      <Button variant="secondary" onClick={() => setStep(2)}>
                        Choose another date
                      </Button>
                    }
                  />
                )}
              </>
            )}
            {step === 4 && (
              <>
                <p>
                  Use fictional details only. These details remain in the local
                  demonstration.
                </p>
                {staff && (
                  <>
                    <Field label="Existing patient">
                      <select
                        value={newPatient ? "new" : draft.patientId}
                        onChange={(e) => {
                          setNewPatient(e.target.value === "new");
                          if (e.target.value === "new") {
                            setDetails({
                              name: "",
                              email: "",
                              phone: "",
                              birthDate: "",
                            });
                            return;
                          }
                          const p = s.patients.find(
                            (p) => p.id === e.target.value,
                          );
                          if (p) {
                            patch({ patientId: p.id });
                            setDetails({
                              name: p.name,
                              email: p.email,
                              phone: p.phone,
                              birthDate: p.birthDate,
                            });
                          }
                        }}
                      >
                        <option value="new">Add a new fictional patient</option>
                        {s.patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.phone}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Booking source">
                      <select
                        value={draft.source}
                        onChange={(e) => patch({ source: e.target.value })}
                      >
                        <option>Reception</option>
                        <option>Telephone</option>
                        <option>Walk-in</option>
                      </select>
                    </Field>
                  </>
                )}
                <div className="form-grid">
                  <Field label="Full name">
                    <input
                      value={details.name}
                      disabled={staff && !newPatient}
                      onChange={(e) =>
                        setDetails({ ...details, name: e.target.value })
                      }
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email address">
                    <input
                      type="email"
                      value={details.email}
                      disabled={staff && !newPatient}
                      onChange={(e) =>
                        setDetails({ ...details, email: e.target.value })
                      }
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Phone number">
                    <input
                      type="tel"
                      value={details.phone}
                      disabled={staff && !newPatient}
                      onChange={(e) =>
                        setDetails({ ...details, phone: e.target.value })
                      }
                      autoComplete="tel"
                    />
                  </Field>
                  {!staff && (
                    <Field label="Date of birth (optional)">
                      <input
                        type="date"
                        max={today()}
                        value={details.birthDate}
                        onChange={(e) =>
                          setDetails({ ...details, birthDate: e.target.value })
                        }
                      />
                    </Field>
                  )}
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <div className="notice">
                  <ShieldCheck size={18} />
                  Demonstration intake. Do not enter real medical information.
                </div>
                <Field
                  label="Fictional reason for your visit"
                  hint="Required. A brief demonstration description is enough."
                >
                  <textarea
                    rows={3}
                    value={draft.intake.reason}
                    onChange={(e) =>
                      patch({
                        intake: { ...draft.intake, reason: e.target.value },
                      })
                    }
                    maxLength={500}
                  />
                </Field>
                <Field label="Accessibility or visit preferences (optional)">
                  <input
                    value={draft.intake.accessibility}
                    onChange={(e) =>
                      patch({
                        intake: {
                          ...draft.intake,
                          accessibility: e.target.value,
                        },
                      })
                    }
                    maxLength={250}
                  />
                </Field>
                <DocumentUploader
                  documents={draft.documents}
                  onChange={(documents: DemoDocument[]) => patch({ documents })}
                />
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.intake.acknowledged}
                    onChange={(e) =>
                      patch({
                        intake: {
                          ...draft.intake,
                          acknowledged: e.target.checked,
                        },
                      })
                    }
                  />
                  I understand this is fictional intake data for a
                  demonstration.
                </label>
              </>
            )}
            {step === 6 && (
              <>
                <div className="review-list">
                  <div>
                    <span>Consultation</span>
                    <strong>{type?.name}</strong>
                  </div>
                  <div>
                    <span>Dentist</span>
                    <strong>{dentist?.name}</strong>
                  </div>
                  <div>
                    <span>Date & time</span>
                    <strong>
                      {draft.date && dateLabel(draft.date, true)} · {draft.time}{" "}
                      SAST
                    </strong>
                  </div>
                  <div>
                    <span>Patient</span>
                    <strong>{details.name}</strong>
                  </div>
                  <div>
                    <span>Sample consultation fee</span>
                    <strong>{money(type?.fee ?? 0)}</strong>
                  </div>
                  <div>
                    <span>
                      {staff
                        ? "Deposit to be tracked by reception"
                        : "Demo deposit due now"}
                    </span>
                    <strong>{money(type?.deposit ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Sample balance after deposit</span>
                    <strong>
                      {money(
                        Math.max(0, (type?.fee ?? 0) - (type?.deposit ?? 0)),
                      )}
                    </strong>
                  </div>
                </div>
                <div className="policy-box">
                  <h3>Before you confirm</h3>
                  <p>{s.content.policy}</p>
                  <Link to="/policies" target="_blank">
                    Read privacy & booking policies
                  </Link>
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={policy}
                    onChange={(e) => setPolicy(e.target.checked)}
                  />
                  I’ve reviewed the demonstration booking policy and sample
                  fees.
                </label>
              </>
            )}
            {step === 7 && (
              <>
                <div className="notice">
                  <LockKeyhole size={19} />
                  Demonstration payment. No real card details or funds are
                  collected.
                </div>
                <div className="checkout-hold">
                  <Clock3 size={23} />
                  <div>
                    <strong>
                      {remaining > 0
                        ? `Slot held for ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}`
                        : "Reservation expired"}
                    </strong>
                    <small>
                      Temporary reservations use the same availability as
                      reception.
                    </small>
                  </div>
                </div>
                <div className="deposit-total">
                  <span>Demo deposit</span>
                  <strong>{money(liveBooking?.deposit ?? 0)}</strong>
                </div>
                <Field label="Simulate a payment outcome">
                  <select
                    value={paymentOutcome}
                    onChange={(e) =>
                      setPaymentOutcome(e.target.value as typeof paymentOutcome)
                    }
                  >
                    <option value="success">Successful demo payment</option>
                    <option value="failure">Failed demo payment</option>
                    <option value="expired">
                      Expired checkout reservation
                    </option>
                  </select>
                </Field>
                {liveBooking?.status === "Awaiting payment" && remaining > 0 ? (
                  <Button onClick={pay} disabled={action.busy}>
                    <CreditCard size={19} />
                    {action.busy
                      ? "Simulating payment…"
                      : "Complete demo payment"}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={restart}>
                    Choose another appointment
                  </Button>
                )}
                <p className="small muted">
                  Payment failure keeps the slot reserved until expiry so you
                  can retry. Expiry releases it for other bookings.
                </p>
              </>
            )}
            {step < 7 && (
              <div className="booking-controls">
                <Button
                  variant="ghost"
                  onClick={() =>
                    step === 0
                      ? navigate(staff ? "/staff" : "/portal")
                      : setStep(step - 1)
                  }
                  disabled={action.busy}
                >
                  <ArrowLeft size={17} />
                  {step === 0 ? "Back to portal" : "Back"}
                </Button>
                <Button onClick={next} disabled={action.busy}>
                  {action.busy
                    ? "Please wait…"
                    : step === 6
                      ? staff || type?.deposit === 0
                        ? "Confirm appointment"
                        : "Continue to demo payment"
                      : "Continue"}
                  <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </section>
          <aside className="panel booking-summary sticky">
            <span className="eyebrow">YOUR BOOKING AT A GLANCE</span>
            <h3>A little care, planned around you.</h3>
            <div className="summary-icon">
              <CalendarDays size={33} />
            </div>
            <div className="summary-line">
              <span>Consultation</span>
              <strong>{type?.name ?? "Choose consultation"}</strong>
            </div>
            <div className="summary-line">
              <span>Dentist</span>
              <strong>{dentist?.name ?? "Choose dentist"}</strong>
            </div>
            <div className="summary-line">
              <span>Date & time</span>
              <strong>
                {draft.date ? dateLabel(draft.date, true) : "Choose your date"}
                {draft.time && ` · ${draft.time}`}
              </strong>
              <small>South African time (SAST)</small>
            </div>
            <div className="summary-line">
              <span>Duration</span>
              <strong>{type?.duration ?? 30} minutes</strong>
            </div>
            <div className="summary-fee">
              <span>Sample fee</span>
              <strong>{money(type?.fee ?? 0)}</strong>
            </div>
            <div className="summary-fee">
              <span>Demo deposit</span>
              <strong>{money(type?.deposit ?? 0)}</strong>
            </div>
            <div className="summary-location">
              <MapPin size={19} />
              <p>
                {s.content.address}
                <br />
                {s.content.city}
              </p>
            </div>
            <Link to="/contact" className="text-link">
              <Phone size={15} />
              Need a little help?
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
