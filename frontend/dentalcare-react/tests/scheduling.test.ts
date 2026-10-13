import { beforeEach, describe, expect, it } from "vitest";
import { createSeed } from "../src/seed";
import { addDays, nextWorkingDay, today } from "../src/time";
import {
  adminService,
  authService,
  bookingService,
  createBooking,
  demoStore,
  expireReservations,
  slotsFor,
} from "../src/services/mock";
import type { BookingDraft } from "../src/domain";
const draft = (date = nextWorkingDay(5)): BookingDraft => ({
  patientId: "p-1",
  dentistId: "d-1",
  consultationId: "general",
  serviceId: "checkups",
  date,
  time: "09:00",
  intake: {
    reason: "Fictional consultation",
    accessibility: "",
    acknowledged: true,
  },
  documents: [],
  source: "Patient portal",
});
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    clear: () => storage.clear(),
  },
  configurable: true,
});
beforeEach(() => {
  localStorage.clear();
  demoStore.reset();
});
describe("Shared scheduling rules", () => {
  it("blocks overlapping starts and releases an expired checkout hold", () => {
    const state = createSeed(),
      d = draft(),
      a = createBooking(state, d);
    expect(a.status).toBe("Awaiting payment");
    expect(() => createBooking(state, { ...d, time: "09:15" })).toThrow(
      "no longer available",
    );
    expect(
      slotsFor(state, d.date, "d-1", "general").find((s) => s.time === "09:30")
        ?.available,
    ).toBe(true);
    expireReservations(state, a.holdExpires! + 1);
    expect(a.paymentStatus).toBe("Expired");
    expect(
      slotsFor(state, d.date, "d-1", "general").find((s) => s.time === "09:00")
        ?.available,
    ).toBe(true);
  });
  it("respects breaks, leave, weekends, duration and past dates", () => {
    const state = createSeed(),
      date = nextWorkingDay(5);
    expect(
      slotsFor(state, date, "d-1", "general").find((s) => s.time === "11:45")
        ?.available,
    ).toBe(false);
    expect(
      slotsFor(state, date, "d-1", "treatment").find((s) => s.time === "16:15"),
    ).toBeUndefined();
    expect(
      slotsFor(state, addDays(today(), -2), "d-1", "general").some(
        (s) => s.available,
      ),
    ).toBe(false);
    const leave = state.blocks.find((b) => b.id === "leave-1")!;
    expect(
      slotsFor(state, leave.date, "d-2", "general").some((s) => s.available),
    ).toBe(false);
  });
  it("rejects unpublished services and disabled consultation types", () => {
    const state = createSeed();
    state.services[0].enabled = false;
    expect(() => createBooking(state, draft())).toThrow("published");
    state.services[0].enabled = true;
    state.consultations[0].enabled = false;
    expect(() => createBooking(state, draft())).toThrow("no longer available");
  });
  it("serialises competing mock requests against freshly persisted records", async () => {
    await authService.login("patient@demo.local", "Demo123!");
    const results = await Promise.allSettled([
      bookingService.reserve(draft()),
      bookingService.reserve(draft()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("keeps a failed payment reserved, supports retry, and prevents duplicate charges", async () => {
    await authService.login("patient@demo.local", "Demo123!");
    const a = await bookingService.reserve(draft());
    expect(
      (await bookingService.completePayment(a.id, "failure")).paymentStatus,
    ).toBe("Failed");
    expect(
      bookingService
        .slots(demoStore.getSnapshot(), a.date, a.dentistId, a.consultationId)
        .find((s) => s.time === a.time)?.available,
    ).toBe(false);
    const paid = await bookingService.completePayment(a.id, "success");
    expect(paid.status).toBe("Confirmed");
    expect(paid.paid).toBe(150);
    await expect(
      bookingService.completePayment(a.id, "success"),
    ).rejects.toThrow();
    expect(
      demoStore.getSnapshot().payments.filter((p) => p.appointmentId === a.id),
    ).toHaveLength(1);
  });
  it("reschedules without losing reference or payment, then releases cancellation", async () => {
    await authService.login("patient@demo.local", "Demo123!");
    const a = await bookingService.reserve(draft());
    await bookingService.completePayment(a.id, "success");
    const moved = await bookingService.reschedule(a.id, a.date, "14:00");
    expect(moved.reference).toBe(a.reference);
    expect(moved.paid).toBe(150);
    const cancelled = await bookingService.cancel(a.id);
    expect(cancelled.status).toBe("Cancelled");
    expect(
      slotsFor(
        demoStore.getSnapshot(),
        a.date,
        a.dentistId,
        a.consultationId,
      ).find((s) => s.time === "14:00")?.available,
    ).toBe(true);
  });
  it("denies another patient record, staff-only types, dentist cross-scheduling and admin settings", async () => {
    await authService.login("patient@demo.local", "Demo123!");
    await expect(bookingService.cancel("a-other")).rejects.toThrow("not found");
    await expect(
      bookingService.reserve({ ...draft(), consultationId: "treatment" }),
    ).rejects.toThrow("Reception");
    await expect(adminService.toggleService("checkups")).rejects.toThrow(
      "role",
    );
    await authService.login("dentist@demo.local", "Demo123!");
    await expect(
      bookingService.reserve({ ...draft(), dentistId: "d-2" }),
    ).rejects.toThrow("own appointments");
    await expect(bookingService.recordPayment("a-next", 20)).rejects.toThrow(
      "role",
    );
  });
  it("records partial payments and an auditable full refund, rejects a second refund", async () => {
    await authService.login("reception@demo.local", "Demo123!");
    await bookingService.recordPayment("a-next", 100.25);
    const a = await bookingService.refund("a-next");
    expect(a.paid).toBe(0);
    expect(a.paymentStatus).toBe("Refunded");
    expect(
      demoStore
        .getSnapshot()
        .payments.find(
          (p) => p.appointmentId === "a-next" && p.status === "Refunded",
        )?.amount,
    ).toBe(250.25);
    await expect(bookingService.refund("a-next")).rejects.toThrow(
      "No unrefunded",
    );
  });
  it("cannot block a booked period, and new admin breaks affect public slots", async () => {
    await authService.login("admin@demo.local", "Demo123!");
    const a = demoStore
      .getSnapshot()
      .appointments.find((a) => a.id === "a-next")!;
    await expect(
      adminService.block({
        dentistId: a.dentistId,
        date: a.date,
        endDate: a.date,
        start: "09:45",
        end: "10:45",
        reason: "Demo leave",
      }),
    ).rejects.toThrow("active appointments");
    const d = draft();
    await adminService.block({
      dentistId: d.dentistId,
      date: d.date,
      endDate: d.date,
      start: "09:00",
      end: "10:00",
      reason: "Demo training",
    });
    expect(
      slotsFor(
        demoStore.getSnapshot(),
        d.date,
        d.dentistId,
        d.consultationId,
      ).find((s) => s.time === "09:00")?.available,
    ).toBe(false);
  });
});
