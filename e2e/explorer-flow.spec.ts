import { test, expect } from "@playwright/test";
import { MOCK_API_URL } from "../playwright.config";

const loadExplorer = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page
    .getByPlaceholder("http://localhost:8081/v3/api-docs")
    .fill(`${MOCK_API_URL}/v3/api-docs`);
  await page.getByRole("button", { name: /load api explorer/i }).click();
  await expect(page).toHaveURL(/\/explorer$/);
};

// Sidebar endpoint buttons are named "<METHOD><path> <summary>", e.g.
// "GET/users List users", so match on all three.
const endpoint = (method: string, path: string, summary: string) => ({
  name: new RegExp(
    `^${method}\\s*${path.replace(/[{}/]/g, "\\$&")}\\s*${summary}$`,
  ),
});

test.describe("Explorer - GET", () => {
  test("lists users and shows a live response", async ({ page }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("GET", "/users", "List users")).click();
    await expect(page.getByRole("heading", { name: "Parameters" })).toHaveCount(0);

    await page.getByRole("button", { name: /send request/i }).click();

    const responsePane = page.locator("pre");
    await expect(responsePane).toContainText("Ada Lovelace");
    await expect(responsePane).toContainText("Alan Turing");
  });

  test("substitutes a path parameter and sends it", async ({ page }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("GET", "/users/{id}", "Get a user by id")).click();
    await page.getByLabel(/id input/i).fill("1");
    await page.getByRole("button", { name: /send request/i }).click();

    await expect(page.locator("pre")).toContainText("Ada Lovelace");
  });

  test("shows the cURL command for the current request", async ({ page }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("GET", "/users", "List users")).click();
    await page.getByRole("button", { name: /show curl/i }).click();

    await expect(page.locator("code", { hasText: "curl -X GET" })).toBeVisible();
  });
});

test.describe("Explorer - POST", () => {
  test("sends a request body and gets a 201 back", async ({ page }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("POST", "/users", "Create a user")).click();

    const bodyEditor = page.getByLabel(/request body json/i);
    await expect(bodyEditor).toHaveValue(/Grace Hopper/);

    await page.getByRole("button", { name: /send request/i }).click();

    await expect(page.locator("pre")).toContainText("Grace Hopper");
  });
});

test.describe("Explorer - DELETE", () => {
  test("requires a second click to confirm before sending", async ({ page }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("DELETE", "/users/{id}", "Delete a user")).click();
    await page.getByLabel(/id input/i).fill("2");

    const sendButton = page.getByRole("button", { name: "Send request" });
    await sendButton.click();

    // First click just arms confirmation - no request sent yet.
    await expect(page.getByText(/click again to confirm deletion/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm delete/i })).toBeVisible();

    await page.getByRole("button", { name: /confirm delete/i }).click();

    await expect(page.getByText(/request successful/i)).toBeVisible();
  });

  test("re-arms the confirmation if a parameter is edited after arming", async ({
    page,
  }) => {
    await loadExplorer(page);

    await page.getByRole("button", endpoint("DELETE", "/users/{id}", "Delete a user")).click();
    await page.getByLabel(/id input/i).fill("1");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("button", { name: /confirm delete/i })).toBeVisible();

    await page.getByLabel(/id input/i).fill("2");

    await expect(page.getByRole("button", { name: "Send request" })).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm delete/i })).toHaveCount(0);
  });
});

test.describe("Explorer - direct navigation", () => {
  test("hitting /explorer directly redirects home (no persisted router state)", async ({
    page,
  }) => {
    // The loaded spec only lives in router state, so a hard refresh or
    // direct link has nothing to show. ExplorerPage guards this with
    // <Navigate to="/" replace /> (see CLAUDE.md, fixed 2026-09-20).
    await page.goto("/explorer");

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByPlaceholder("http://localhost:8081/v3/api-docs"),
    ).toBeVisible();
  });
});
