import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
test("accessible names, landmarks, keyboard dialogs and contrast", async ({
  page,
}) => {
  for (const route of ["/", "/services", "/login"]) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.goto("/login");
  await page.getByRole("button", { name: "Patient", exact: true }).click();
  await expect(page).toHaveURL(/portal$/);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.goto("/portal/appointments/a-next");
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cancel this appointment?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel appointment", exact: true }),
  ).toBeFocused();
});
