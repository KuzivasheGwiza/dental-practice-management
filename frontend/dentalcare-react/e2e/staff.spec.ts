import { test, expect } from "@playwright/test";
test("manual telephone treatment booking, payment tracking, refund and reports", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Reception", exact: true }).click();
  await expect(page).toHaveURL(/staff$/);
  await page.goto("/staff/book?patient=p-2");
  await page
    .getByRole("button", { name: /Practice-approved treatment visit/ })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /Dr Daniel Adams/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator(".date-option:not(:disabled)").nth(1).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator(".time-grid button:not(:disabled)").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Existing patient")).toHaveValue("p-2");
  await page.getByLabel("Booking source").selectOption("Telephone");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Fictional reason for your visit")
    .fill("Fictional practice-approved visit");
  await page.getByLabel("I understand this is fictional intake").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".review-list")).toContainText("Casey Williams");
  await page.getByLabel("reviewed the demonstration booking policy").check();
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "We look forward to welcoming you." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View appointment", exact: true })
    .click();
  await expect(page.locator(".review-list")).toContainText("Telephone");
  await expect(page.locator(".intake-detail")).toHaveCount(0);
  await page.getByLabel("Record a demo payment (R)").fill("300");
  await page
    .getByRole("button", { name: "Record demo payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("recorded");
  await page.getByRole("button", { name: "Simulate a refund" }).click();
  await page.getByRole("button", { name: "Confirm demo refund" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".review-list .badge")).toHaveText("Refunded");
  await page.getByLabel("Update status").selectOption("Checked in");
  await expect(page.locator(".page-heading .badge")).toHaveText("Checked in");
  await page.goto("/staff/reports");
  await expect(page.locator(".review-list")).toContainText("Demo refunds");
  await expect(page.locator("tbody")).toContainText("Casey Williams");
});
test("admin duration and deposit editing, unavailable periods and existing staff role changes", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/staff$/);
  await page.goto("/staff/consultations");
  await page.getByRole("button", { name: "Edit settings" }).first().click();
  await page.getByLabel("Duration (minutes)").fill("45");
  await page.getByLabel("Sample fee (R)").fill("500");
  await page.getByLabel("Demo deposit (R)").fill("200");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("45 min");
  await page.goto("/staff/availability");
  await page.getByLabel("Reason", { exact: true }).fill("Fictional training");
  await page.getByLabel("Start time", { exact: true }).fill("15:00");
  await page.getByLabel("End time", { exact: true }).fill("16:00");
  await page.getByRole("button", { name: "Block availability" }).click();
  await expect(page.getByRole("status")).toContainText("added");
  await expect(page.locator(".setting-row")).toContainText([
    "Daily lunch break",
    "Fictional training",
  ]);
  await page
    .locator(".setting-row")
    .filter({ hasText: "Fictional training" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove period", exact: true })
    .click();
  await expect(
    page.locator(".setting-row").filter({ hasText: "Fictional training" }),
  ).toHaveCount(0);
  await page.goto("/staff/team");
  await page
    .locator("tbody tr")
    .filter({ hasText: "Alex Reed" })
    .getByRole("button", { name: "Change role" })
    .click();
  await page.getByLabel("New staff role").selectOption("dentist");
  await page.getByRole("button", { name: "Confirm role change" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Alex Reed" }),
  ).toContainText("dentist");
  await page.goto("/staff/calendar");
  for (const view of ["Day", "Month", "Week", "List"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.locator(".calendar-bottom")).toContainText(
      "appointments in this view",
    );
  }
  await page.getByLabel("Status", { exact: true }).selectOption("Cancelled");
  await expect(page.locator("tbody tr")).toHaveCount(0);
});
