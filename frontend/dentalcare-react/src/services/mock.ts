import type {
  Appointment,
  Availability,
  AvailabilityBlock,
  BookingDraft,
  ConsultationType,
  DemoDocument,
  DemoState,
  Role,
  SiteContent,
  User,
} from "../domain";
import { createSeed } from "../seed";
import { clock, dayOfWeek, minutes, timestamp, today } from "../time";

export const STORAGE_KEY = "dentalcare-react-demo-v1";
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export function expireReservations(state: DemoState, now = Date.now()) {
  let changed = false;
  for (const a of state.appointments)
    if (
      a.status === "Awaiting payment" &&
      a.holdExpires &&
      a.holdExpires <= now
    ) {
      a.status = "Cancelled";
      a.paymentStatus = "Expired";
      changed = true;
    }
  return changed;
}
export function slotsFor(
  state: DemoState,
  date: string,
  dentistId: string,
  consultationId: string,
  ignoreId?: string,
) {
  const working = state.availability.find((x) => x.dentistId === dentistId),
    type = state.consultations.find((x) => x.id === consultationId);
  const dentist = state.dentists.find((d) => d.id === dentistId),
    account = state.users.find((u) => u.id === dentist?.userId);
  if (
    !working ||
    !type ||
    !type.enabled ||
    (account && (!account.active || account.role !== "dentist")) ||
    !working.weekdays.includes(dayOfWeek(date))
  )
    return [];
  const end =
    dayOfWeek(date) === 6
      ? Math.min(minutes(working.end), 13 * 60)
      : minutes(working.end);
  const result: { time: string; available: boolean; reason: string }[] = [];
  for (
    let time = minutes(working.start);
    time + type.duration <= end;
    time += 15
  ) {
    const overlaps = (start: number, length: number) =>
      time < start + length && time + type.duration > start;
    const blocked = state.blocks.find(
      (b) =>
        b.dentistId === dentistId &&
        b.date <= date &&
        b.endDate >= date &&
        overlaps(minutes(b.start), minutes(b.end) - minutes(b.start)),
    );
    const booked = state.appointments.some(
      (a) =>
        a.id !== ignoreId &&
        a.date === date &&
        a.dentistId === dentistId &&
        !["Cancelled", "No-show"].includes(a.status) &&
        !(
          a.status === "Awaiting payment" &&
          a.holdExpires &&
          a.holdExpires <= Date.now()
        ) &&
        overlaps(minutes(a.time), a.duration),
    );
    const past = timestamp(date, clock(time)) <= Date.now();
    result.push({
      time: clock(time),
      available: !blocked && !booked && !past,
      reason: past
        ? "Time has passed"
        : blocked
          ? blocked.reason
          : booked
            ? "Already reserved"
            : "",
    });
  }
  return result;
}
export function createBooking(
  state: DemoState,
  draft: BookingDraft,
  reserve = true,
): Appointment {
  const type = state.consultations.find(
    (x) => x.id === draft.consultationId && x.enabled,
  );
  if (!type) throw new Error("This consultation is no longer available.");
  if (!state.patients.some((x) => x.id === draft.patientId))
    throw new Error("Select a patient before booking.");
  if (!state.services.some((x) => x.id === draft.serviceId && x.enabled))
    throw new Error("This service is no longer published.");
  if (
    !state.dentists.some(
      (x) =>
        x.id === draft.dentistId &&
        state.users.find((u) => u.id === x.userId)?.active !== false,
    )
  )
    throw new Error("Select a dentist before booking.");
  if (
    !slotsFor(state, draft.date, draft.dentistId, draft.consultationId).some(
      (x) => x.time === draft.time && x.available,
    )
  )
    throw new Error(
      "That time is no longer available. Please choose another slot.",
    );
  const pending = reserve && type.deposit > 0;
  const a: Appointment = {
    ...draft,
    id: uid("appt"),
    reference: `DC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    duration: type.duration,
    fee: type.fee,
    deposit: type.deposit,
    paid: 0,
    status: pending ? "Awaiting payment" : "Confirmed",
    paymentStatus: pending ? "Pending" : "Unpaid",
    holdExpires: pending ? Date.now() + 5 * 60 * 1000 : undefined,
  };
  state.appointments.push(a);
  return a;
}
const load = (): DemoState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as DemoState;
      if (
        data.version === 1 &&
        Array.isArray(data.appointments) &&
        data.content
      )
        return data;
    }
  } catch {
    /* storage unavailable or reset */
  }
  return createSeed();
};
let snapshot = typeof localStorage === "undefined" ? createSeed() : load();
const listeners = new Set<() => void>();
function save(state: DemoState) {
  snapshot = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* state remains available for this tab */
  }
  listeners.forEach((fn) => fn());
}
function fresh() {
  const state =
    typeof localStorage === "undefined" ? structuredClone(snapshot) : load();
  expireReservations(state);
  return state;
}
function actor(state: DemoState) {
  const user = state.users.find(
    (u) => u.id === state.sessionUserId && u.active,
  );
  if (!user) throw new Error("Please sign in to continue.");
  return user;
}
function staff(
  state: DemoState,
  roles: Role[] = ["administrator", "receptionist", "dentist"],
) {
  const u = actor(state);
  if (!roles.includes(u.role))
    throw new Error("Your demo role cannot perform this action.");
  return u;
}
function access(state: DemoState, a: Appointment) {
  const u = actor(state);
  if (
    u.role === "patient" &&
    state.patients.find((p) => p.userId === u.id)?.id !== a.patientId
  )
    throw new Error("Appointment not found.");
  if (
    u.role === "dentist" &&
    state.dentists.find((d) => d.userId === u.id)?.id !== a.dentistId
  )
    throw new Error("This appointment belongs to another dentist.");
  return u;
}
function find(state: DemoState, id: string) {
  const a = state.appointments.find((a) => a.id === id);
  if (!a) throw new Error("Appointment not found.");
  access(state, a);
  return a;
}
function notify(
  state: DemoState,
  a: Appointment,
  title: string,
  message: string,
  kind: "confirmation" | "reminder" | "change" | "payment",
) {
  state.notifications.unshift({
    id: uid("notice"),
    patientId: a.patientId,
    appointmentId: a.id,
    title,
    message,
    kind,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 180));
async function change<T>(fn: (s: DemoState) => T): Promise<T> {
  await pause();
  const state = fresh();
  const result = fn(state);
  save(state);
  return structuredClone(result);
}

export const demoStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  getSnapshot: () => snapshot,
  sync() {
    const state = fresh();
    if (JSON.stringify(state) !== JSON.stringify(snapshot)) save(state);
  },
  reset() {
    save(createSeed());
  },
};
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      snapshot = load();
      listeners.forEach((fn) => fn());
    }
  });

/** Replace these typed adapters with API calls when connecting the real backend. */
export const authService = {
  login(email: string, password: string) {
    return change((s) => {
      const u = s.users.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password &&
          u.active,
      );
      if (!u)
        throw new Error(
          "Email or password is incorrect. Demo accounts use Demo123!.",
        );
      s.sessionUserId = u.id;
      return u;
    });
  },
  logout() {
    return change((s) => {
      s.sessionUserId = null;
    });
  },
  register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    return change((s) => {
      if (
        !input.name.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email) ||
        input.phone.replace(/\D/g, "").length < 9 ||
        input.password.length < 8
      )
        throw new Error(
          "Enter your name, a valid email and phone number, and a password of at least 8 characters.",
        );
      if (
        s.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())
      )
        throw new Error("That demo email is already registered.");
      const u: User = {
        ...input,
        id: uid("user"),
        role: "patient",
        active: true,
      };
      s.users.push(u);
      s.patients.push({
        id: uid("patient"),
        userId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        birthDate: "",
        preferences: { email: true, sms: false, reminders: true },
        documents: [],
      });
      s.sessionUserId = u.id;
      return u;
    });
  },
  recover(email: string) {
    return change((s) => {
      if (!/^\S+@\S+\.\S+$/.test(email))
        throw new Error("Enter a valid email address.");
      s.recoveryRequests.push({
        id: uid("recovery"),
        email,
        createdAt: new Date().toISOString(),
      });
      return "Demo recovery request recorded. No email was sent; use a demo account to continue.";
    });
  },
};
export const bookingService = {
  slots: slotsFor,
  reserve(draft: BookingDraft) {
    return change((s) => {
      const u = actor(s);
      if (u.role === "patient") {
        if (s.patients.find((p) => p.userId === u.id)?.id !== draft.patientId)
          throw new Error("Book using your own patient profile.");
        if (
          !s.consultations.find((c) => c.id === draft.consultationId)
            ?.patientBookable
        )
          throw new Error(
            "Reception schedules treatment visits after assessment.",
          );
      }
      if (
        u.role === "dentist" &&
        s.dentists.find((d) => d.userId === u.id)?.id !== draft.dentistId
      )
        throw new Error("Dentists may schedule only their own appointments.");
      const a = createBooking(s, draft, u.role === "patient");
      if (a.status === "Confirmed")
        notify(
          s,
          a,
          "Appointment confirmed",
          `Your reference is ${a.reference}.`,
          "confirmation",
        );
      return a;
    });
  },
  completePayment(id: string, outcome: "success" | "failure" | "expired") {
    return change((s) => {
      const a = find(s, id);
      if (
        a.status !== "Awaiting payment" ||
        !a.holdExpires ||
        a.holdExpires <= Date.now()
      )
        throw new Error(
          "This checkout hold has expired. Please select an available time and book again.",
        );
      if (outcome === "expired") {
        a.holdExpires = Date.now() - 1;
        expireReservations(s);
        return a;
      }
      if (outcome === "failure") {
        a.paymentStatus = "Failed";
        notify(
          s,
          a,
          "Demo payment failed",
          "Your slot remains held until checkout expires. You can retry without entering card details.",
          "payment",
        );
        return a;
      }
      a.paid = a.deposit;
      a.paymentStatus = "Paid";
      a.status = "Confirmed";
      a.holdExpires = undefined;
      s.payments.push({
        id: uid("receipt"),
        appointmentId: a.id,
        amount: a.deposit,
        date: today(),
        status: "Recorded",
        method: "Demo deposit",
      });
      notify(
        s,
        a,
        "Appointment confirmed",
        `Your demo deposit is recorded. Reference ${a.reference}.`,
        "confirmation",
      );
      return a;
    });
  },
  cancel(id: string) {
    return change((s) => {
      const a = find(s, id),
        u = actor(s);
      if (a.status === "Cancelled") return a;
      if (["Completed", "No-show"].includes(a.status))
        throw new Error("This appointment can no longer be cancelled.");
      if (
        u.role === "patient" &&
        timestamp(a.date, a.time) <
          Date.now() + s.content.cancellationHours * 3600000
      )
        throw new Error(
          "The online change deadline has passed. Contact reception for help.",
        );
      a.status = "Cancelled";
      if (a.paymentStatus === "Pending" || a.paymentStatus === "Failed")
        a.paymentStatus = "Expired";
      a.holdExpires = undefined;
      notify(
        s,
        a,
        "Appointment cancelled",
        a.paid > 0
          ? "Contact reception to review your demonstration deposit."
          : "Your appointment slot has been released.",
        "change",
      );
      return a;
    });
  },
  reschedule(id: string, date: string, time: string) {
    return change((s) => {
      const a = find(s, id),
        u = actor(s);
      if (
        ["Cancelled", "Completed", "No-show", "Awaiting payment"].includes(
          a.status,
        )
      )
        throw new Error(
          "This appointment cannot be rescheduled in its current state.",
        );
      if (
        u.role === "patient" &&
        timestamp(a.date, a.time) <
          Date.now() + s.content.cancellationHours * 3600000
      )
        throw new Error(
          "The online change deadline has passed. Contact reception for help.",
        );
      if (
        !slotsFor(s, date, a.dentistId, a.consultationId, id).some(
          (x) => x.time === time && x.available,
        )
      )
        throw new Error("That time is no longer available.");
      a.date = date;
      a.time = time;
      notify(
        s,
        a,
        "Appointment rescheduled",
        `Your new time is ${date} at ${time} SAST.`,
        "change",
      );
      return a;
    });
  },
  updateStatus(id: string, status: Appointment["status"]) {
    return change((s) => {
      staff(s);
      const a = find(s, id);
      if (a.status === "Awaiting payment")
        throw new Error(
          "Complete or expire the demonstration payment before changing status.",
        );
      if (status === "Cancelled")
        throw new Error("Use the cancellation action to release this booking.");
      if (["Awaiting payment", "Awaiting approval"].includes(status))
        throw new Error(
          "Use the booking workflow to create pending appointments.",
        );
      if (["Cancelled", "Completed", "No-show"].includes(a.status))
        throw new Error("This appointment is closed.");
      a.status = status;
      notify(
        s,
        a,
        "Appointment updated",
        `Your booking status is now ${status}.`,
        "change",
      );
      return a;
    });
  },
  recordPayment(id: string, amount: number) {
    return change((s) => {
      staff(s, ["administrator", "receptionist"]);
      const a = find(s, id);
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > Math.max(0, a.fee - a.paid) ||
        Math.abs(Math.round(amount * 100) - amount * 100) > 0.00001
      )
        throw new Error(
          "Enter a valid amount no greater than the outstanding sample fee.",
        );
      if (a.status === "Cancelled" || a.status === "Awaiting payment")
        throw new Error("This booking cannot accept a reception payment.");
      a.paid = Math.round((a.paid + amount) * 100) / 100;
      a.paymentStatus = "Paid";
      s.payments.push({
        id: uid("receipt"),
        appointmentId: a.id,
        amount,
        date: today(),
        status: "Recorded",
        method: "Reception demo payment",
      });
      notify(
        s,
        a,
        "Demo payment recorded",
        `R${amount} was recorded at reception.`,
        "payment",
      );
      return a;
    });
  },
  refund(id: string) {
    return change((s) => {
      staff(s, ["administrator", "receptionist"]);
      const a = find(s, id);
      if (a.paid <= 0) throw new Error("No unrefunded payment is available.");
      s.payments.push({
        id: uid("refund"),
        appointmentId: a.id,
        amount: a.paid,
        date: today(),
        status: "Refunded",
        method: "Demo refund",
      });
      a.paid = 0;
      a.paymentStatus = "Refunded";
      notify(
        s,
        a,
        "Demo refund recorded",
        "The fictional payment has been refunded. No real funds moved.",
        "payment",
      );
      return a;
    });
  },
};
export const patientService = {
  update(input: {
    name: string;
    email: string;
    phone: string;
    birthDate: string;
  }) {
    return change((s) => {
      const u = actor(s),
        p = s.patients.find((p) => p.userId === u.id);
      if (!p) throw new Error("Patient profile not found.");
      if (
        !input.name.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email) ||
        input.phone.replace(/\D/g, "").length < 9
      )
        throw new Error("Enter valid profile details.");
      if (
        s.users.some(
          (x) =>
            x.id !== u.id &&
            x.email.toLowerCase() === input.email.toLowerCase(),
        )
      )
        throw new Error("That email is already in use.");
      if (input.birthDate && input.birthDate > today())
        throw new Error("Date of birth must be in the past.");
      Object.assign(p, input);
      Object.assign(u, {
        name: input.name,
        email: input.email,
        phone: input.phone,
      });
      return p;
    });
  },
  preferences(input: { email: boolean; sms: boolean; reminders: boolean }) {
    return change((s) => {
      const p = s.patients.find((p) => p.userId === actor(s).id);
      if (!p) throw new Error("Profile not found.");
      p.preferences = input;
      return p;
    });
  },
  documents(documents: DemoDocument[]) {
    return change((s) => {
      const p = s.patients.find((p) => p.userId === actor(s).id);
      if (!p) throw new Error("Profile not found.");
      p.documents = documents;
      return p;
    });
  },
  markRead(id: string) {
    return change((s) => {
      const p = s.patients.find((p) => p.userId === actor(s).id);
      const n = s.notifications.find(
        (n) => n.id === id && n.patientId === p?.id,
      );
      if (n) n.read = true;
    });
  },
  add(input: { name: string; email: string; phone: string }) {
    return change((s) => {
      staff(s, ["administrator", "receptionist"]);
      if (
        !input.name.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email) ||
        input.phone.replace(/\D/g, "").length < 9
      )
        throw new Error("Enter a name, valid email and phone number.");
      const existing = s.patients.find(
        (p) => p.email.toLowerCase() === input.email.toLowerCase(),
      );
      if (existing) return existing;
      const p = {
        ...input,
        id: uid("patient"),
        userId: "",
        birthDate: "",
        preferences: { email: true, sms: false, reminders: true },
        documents: [],
      };
      s.patients.push(p);
      return p;
    });
  },
};
export const adminService = {
  content(content: SiteContent) {
    return change((s) => {
      staff(s, ["administrator"]);
      if (
        !content.name.trim() ||
        !content.heroHeadline.trim() ||
        !/^\S+@\S+\.\S+$/.test(content.email) ||
        content.cancellationHours < 0 ||
        content.cancellationHours > 168
      )
        throw new Error(
          "Check the practice name, headline, email and change deadline.",
        );
      s.content = content;
    });
  },
  toggleService(id: string) {
    return change((s) => {
      staff(s, ["administrator"]);
      const item = s.services.find((x) => x.id === id);
      if (item) item.enabled = !item.enabled;
    });
  },
  consultation(type: ConsultationType) {
    return change((s) => {
      staff(s, ["administrator"]);
      if (
        !type.name.trim() ||
        type.duration < 15 ||
        type.duration > 180 ||
        type.duration % 15 !== 0 ||
        !Number.isFinite(type.fee) ||
        !Number.isFinite(type.deposit) ||
        type.fee < 0 ||
        type.deposit < 0 ||
        type.deposit > type.fee
      )
        throw new Error(
          "Use a duration in 15-minute intervals, a nonnegative fee and a deposit no greater than the fee.",
        );
      const index = s.consultations.findIndex((c) => c.id === type.id);
      if (index < 0) throw new Error("Consultation not found.");
      s.consultations[index] = type;
    });
  },
  availability(input: Availability) {
    return change((s) => {
      staff(s, ["administrator"]);
      if (minutes(input.end) <= minutes(input.start) || !input.weekdays.length)
        throw new Error("Choose working days and an end time after the start.");
      const index = s.availability.findIndex(
        (a) => a.dentistId === input.dentistId,
      );
      if (index < 0) throw new Error("Dentist not found.");
      s.availability[index] = input;
    });
  },
  block(input: Omit<AvailabilityBlock, "id">) {
    return change((s) => {
      staff(s, ["administrator"]);
      if (
        !input.reason.trim() ||
        input.endDate < input.date ||
        minutes(input.end) <= minutes(input.start)
      )
        throw new Error("Enter valid dates, times and a reason.");
      if (
        s.appointments.some(
          (a) =>
            a.dentistId === input.dentistId &&
            a.date >= input.date &&
            a.date <= input.endDate &&
            !["Cancelled", "No-show", "Completed"].includes(a.status) &&
            minutes(a.time) < minutes(input.end) &&
            minutes(a.time) + a.duration > minutes(input.start),
        )
      )
        throw new Error(
          "This period contains active appointments. Reschedule or cancel them before blocking it.",
        );
      s.blocks.push({ ...input, id: uid("block") });
    });
  },
  removeBlock(id: string) {
    return change((s) => {
      staff(s, ["administrator"]);
      s.blocks = s.blocks.filter((x) => x.id !== id);
    });
  },
  staff(input: { name: string; email: string; role: Role }) {
    return change((s) => {
      staff(s, ["administrator"]);
      if (
        !input.name.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email) ||
        input.role === "patient"
      )
        throw new Error("Enter a name, valid email and staff role.");
      if (
        s.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())
      )
        throw new Error("That email is already in use.");
      const u: User = {
        ...input,
        id: uid("user"),
        password: "Demo123!",
        phone: "070 000 0199",
        active: true,
      };
      s.users.push(u);
      if (u.role === "dentist") {
        s.dentists.push({
          id: uid("dentist"),
          userId: u.id,
          name: u.name,
          initials: u.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0])
            .join(""),
          focus: "Fictional dental profile",
          bio: "Demo profile. Approved professional information awaits supply.",
          colour: "mint",
        });
        const dentist = s.dentists[s.dentists.length - 1];
        s.availability.push({
          dentistId: dentist.id,
          weekdays: [1, 2, 3, 4, 5],
          start: "09:00",
          end: "16:00",
        });
      }
      return u;
    });
  },
  role(id: string, role: Exclude<Role, "patient">) {
    return change((s) => {
      const current = staff(s, ["administrator"]);
      if (current.id === id)
        throw new Error("Use another administrator to change your own role.");
      const u = s.users.find((u) => u.id === id && u.role !== "patient");
      if (!u) throw new Error("Staff account not found.");
      const dentist = s.dentists.find((d) => d.userId === id);
      if (
        u.role === "dentist" &&
        role !== "dentist" &&
        s.appointments.some(
          (a) =>
            a.dentistId === dentist?.id &&
            !["Cancelled", "Completed", "No-show"].includes(a.status) &&
            timestamp(a.date, a.time) > Date.now(),
        )
      )
        throw new Error(
          "This dentist has upcoming bookings. Complete or cancel them before changing the role.",
        );
      u.role = role;
      if (role === "dentist" && !dentist) {
        const d = {
          id: uid("dentist"),
          userId: id,
          name: u.name,
          initials: u.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0])
            .join(""),
          focus: "Fictional dental profile",
          bio: "Demo profile. Approved professional information awaits supply.",
          colour: "mint",
        };
        s.dentists.push(d);
        s.availability.push({
          dentistId: d.id,
          weekdays: [1, 2, 3, 4, 5],
          start: "09:00",
          end: "16:00",
        });
      }
      return u;
    });
  },
  toggleStaff(id: string) {
    return change((s) => {
      const current = staff(s, ["administrator"]);
      if (current.id === id)
        throw new Error("You cannot disable your own demo account.");
      const u = s.users.find((x) => x.id === id && x.role !== "patient");
      if (u) u.active = !u.active;
    });
  },
};
