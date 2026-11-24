import { test, expect } from "@playwright/test";
import { MOCK_API_URL } from "../playwright.config";

test.describe("Home page", () => {
  test("shows the OpenAPI URL form with the load button disabled until a URL is entered", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /try any api straight from its spec/i }),
    ).toBeVisible();
    const loadButton = page.getByRole("button", { name: /load api explorer/i });
    await expect(loadButton).toBeDisabled();

    await page.getByPlaceholder("http://localhost:8081/v3/api-docs").fill("x");
    await expect(loadButton).toBeEnabled();
  });

  test("shows an error banner when the spec cannot be loaded", async ({ page }) => {
    await page.goto("/");

    await page
      .getByPlaceholder("http://localhost:8081/v3/api-docs")
      .fill("http://localhost:1/does-not-exist");
    await page.getByRole("button", { name: /load api explorer/i }).click();

    await expect(
      page.getByText(/failed to load api spec/i),
    ).toBeVisible();
    // Must not have navigated away on failure.
    await expect(page).toHaveURL(/\/$/);
  });

  test("loads a real spec and navigates to the explorer", async ({ page }) => {
    await page.goto("/");

    await page
      .getByPlaceholder("http://localhost:8081/v3/api-docs")
      .fill(`${MOCK_API_URL}/v3/api-docs`);
    await page.getByRole("button", { name: /load api explorer/i }).click();

    await expect(page).toHaveURL(/\/explorer$/);
    await expect(page.getByText("Users (4)")).toBeVisible();
  });
});
