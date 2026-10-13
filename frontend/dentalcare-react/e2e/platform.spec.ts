import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Patient") {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page).toHaveURL(role === "Patient" ? /\/portal$/ : /\/staff$/);
}
async function next(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function toCheckout(page: Page) {
  await page.goto("/book");
  await next(page);
  await next(page);
  await page.locator(".date-option:not(:disabled)").nth(1).click();
  await next(page);
  await page.locator(".time-grid button:not(:disabled)").first().click();
  await next(page);
  await next(page);
  await page
    .getByLabel("Fictional reason for your visit")
    .fill("Fictional routine check-up");
  await page.getByLabel("I understand this is fictional intake").check();
  await next(page);
  await expect(page.locator(".review-list")).toContainText("Jamie Morgan");
  await page.getByLabel("reviewed the demonstration booking policy").check();
  await page.getByRole("button", { name: "Continue to demo payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete your demo deposit." }),
  ).toBeVisible();
}
test("guided booking, failed payment retry, shared staff calendar, reschedule and cancellation", async ({
  page,
}) => {
  await login(page);
  await toCheckout(page);
  await page.getByLabel("Simulate a payment outcome").selectOption("failure");
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await expect(page.getByRole("alert")).toContainText("payment failed");
  await page.getByLabel("Simulate a payment outcome").selectOption("success");
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await expect(
    page.getByRole("heading", { name: "We look forward to welcoming you." }),
  ).toBeVisible();
  const ref = await page.locator(".confirmation-reference strong").innerText();
  await page
    .getByRole("link", { name: "View appointment", exact: true })
    .click();
  const detail = page.url();
  await page.getByRole("button", { name: "Reschedule", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const date = await page.locator(".page-heading p").innerText();
  expect(date).toContain("SAST");
  const stored = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("dentalcare-react-demo-v1")!,
      ).appointments.at(-1).date,
  );
  await page.getByLabel("New appointment date").fill(stored);
  await page.getByLabel("Available time (SAST)").selectOption("14:00");
  await page.getByRole("button", { name: "Save new time" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".page-heading p")).toContainText("14:00");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Reception", exact: true }).click();
  await expect(page).toHaveURL(/staff$/);
  await page.goto("/staff/calendar");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByLabel("Patient or reference").fill(ref);
  await expect(page.locator("tbody")).toContainText(ref);
  await expect(page.locator("tbody")).toContainText("14:00");
  await page.getByRole("link", { name: "Open", exact: true }).click();
  await expect(page.locator(".intake-detail")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Patient", exact: true }).click();
  await expect(page).toHaveURL(/portal$/);
  await page.goto(detail);
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(page.locator(".page-heading .badge")).toHaveText("Cancelled");
});
test("expired checkout releases its reservation and keeps details for a retry", async ({
  page,
}) => {
  await login(page);
  await toCheckout(page);
  await page.getByLabel("Simulate a payment outcome").selectOption("expired");
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await page
    .getByRole("button", { name: "Choose another appointment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find a day that fits." }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dentalcare-react-demo-v1")!),
  );
  expect(state.appointments.at(-1).paymentStatus).toBe("Expired");
});
test("profile, preferences, document validation, upload progress and removal", async ({
  page,
}) => {
  await login(page);
  await page.goto("/portal/profile");
  await page.getByLabel("Full name").fill("Jamie Demo");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");
  await page.goto("/portal/notifications");
  await page.getByLabel("SMS updates").check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.goto("/portal/documents");
  const file = page.getByLabel("Upload demonstration document");
  await file.setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("fictional"),
  });
  await expect(page.getByRole("alert")).toContainText("PDF, JPG or PNG");
  await file.setInputFiles({
    name: "fictional.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fictional metadata"),
  });
  await expect(page.locator(".upload-progress")).toBeVisible();
  await expect(page.locator(".document-item")).toContainText("fictional.pdf");
  await page
    .getByRole("button", { name: "Save demonstration documents" })
    .click();
  await expect(page.getByRole("status")).toContainText("metadata saved");
  await page.reload();
  await expect(page.locator(".document-item")).toContainText("fictional.pdf");
  await page.getByRole("button", { name: "Remove fictional.pdf" }).click();
  await expect(page.locator(".document-item")).toHaveCount(0);
});
test("validation, back navigation preserves intake, mock registration and recovery", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Demo New");
  await page.getByLabel("Email address").fill("new@example.invalid");
  await page.getByLabel("Phone number").fill("0700000999");
  await page.locator("input[type=password]").first().fill("Demo123!");
  await page.getByLabel("Confirm password").fill("Wrong123!");
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await page.getByLabel("Confirm password").fill("Demo123!");
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page).toHaveURL(/portal$/);
  await page.goto("/book");
  await next(page);
  await next(page);
  await next(page);
  await expect(page.getByRole("alert")).toContainText("Choose a date");
  await page.locator(".date-option:not(:disabled)").nth(1).click();
  await next(page);
  await page.locator(".time-grid button:not(:disabled)").first().click();
  await next(page);
  await next(page);
  await page
    .getByLabel("Fictional reason for your visit")
    .fill("Fictional reason retained");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await next(page);
  await expect(page.getByLabel("Fictional reason for your visit")).toHaveValue(
    "Fictional reason retained",
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("new@example.invalid");
  await page.getByRole("button", { name: "Request demo recovery" }).click();
  await expect(page.getByRole("status")).toContainText("recorded");
});
test("admin publication, service visibility, fees and staff role navigation", async ({
  page,
}) => {
  await login(page, "Admin");
  await page.goto("/staff/content");
  await page.getByLabel("Practice name").fill("DentalCare Demo");
  await page
    .getByRole("button", { name: "Publish demonstration content" })
    .click();
  await expect(page.getByRole("status")).toContainText("published");
  await page.goto("/staff/consultations");
  await page.getByLabel("Dental check-ups & consultations").click();
  await expect(
    page.getByLabel("Dental check-ups & consultations"),
  ).not.toBeChecked();
  await expect(page.getByRole("status")).toContainText("visibility");
  await page.goto("/services");
  await expect(page.locator(".service-card")).toHaveCount(14);
  await expect(page.locator(".public-header .brand")).toContainText(
    "DentalCare Demo",
  );
  await page.goto("/staff/team");
  await page.getByLabel("Full name").fill("Demo Reception");
  await page.getByLabel("Demo email address").fill("second@example.invalid");
  await page.getByRole("button", { name: "Create fictional account" }).click();
  await expect(page.locator("tbody")).toContainText("Demo Reception");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Dentist", exact: true }).click();
  await expect(page).toHaveURL(/staff$/);
  await expect(page.locator(".sidebar nav")).not.toContainText(
    "Website content",
  );
  await page.goto("/staff/appointments/a-other");
  await expect(
    page.getByRole("heading", { name: "Appointment not found" }),
  ).toBeVisible();
});
for (const width of [390, 768, 1440])
  test(`navigation and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of [
      "/",
      "/services",
      "/services/root-canal",
      "/about",
      "/consultations",
      "/faqs",
      "/contact",
      "/policies",
      "/login",
    ]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await page.goto("/");
    await page.screenshot({
      path: `artifacts/home-${width}.png`,
      fullPage: true,
    });
    if (width < 950) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("link", { name: "Services", exact: true }).click();
      await expect(page).toHaveURL(/services$/);
    }
    await login(page);
    await page.screenshot({
      path: `artifacts/patient-${width}.png`,
      fullPage: true,
    });
    for (const route of [
      "/portal",
      "/portal/appointments",
      "/portal/profile",
      "/portal/payments",
      "/portal/documents",
      "/portal/notifications",
      "/book",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    if (width < 950) {
      await page
        .getByRole("button", { name: "Open portal navigation" })
        .click();
      await page
        .getByRole("link", { name: "My appointments", exact: true })
        .click();
      await expect(page).toHaveURL(/appointments$/);
    }
    await login(page, "Admin");
    for (const route of [
      "/staff",
      "/staff/calendar",
      "/staff/patients",
      "/staff/book",
      "/staff/availability",
      "/staff/consultations",
      "/staff/content",
      "/staff/team",
      "/staff/reports",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await page.goto("/staff/calendar");
    await page.screenshot({
      path: `artifacts/calendar-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
