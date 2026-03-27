import { test, expect } from "@playwright/test";

// Security/cache header tests require a production reverse-proxy (nginx).
// CI uses vite preview on localhost — skip unless pointed at a real domain.
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "";
const isProduction = baseUrl.startsWith("https://");

test.describe("App Loading", () => {
  test("should load the login page", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveTitle(/Advanced Think Tank/i);
    // Should have a sign-in form or auth UI
    await expect(page.locator("body")).toBeVisible();
  });

  test("should redirect unauthenticated users to auth", async ({ page }) => {
    await page.goto("/");
    // Should redirect to /auth or show auth UI
    await page.waitForURL(/\/(auth)?$/);
  });

  test("should have proper security headers", async ({ page }) => {
    test.skip(!isProduction, "Security headers are set by nginx, not the dev server");
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeTruthy();
  });

  test("should serve static assets with cache headers", async ({ page }) => {
    test.skip(!isProduction, "Cache headers are set by nginx, not the dev server");
    await page.goto("/");
    // Check that CSS/JS assets have cache headers
    const responses: { url: string; cacheControl: string }[] = [];
    page.on("response", (resp) => {
      if (resp.url().includes("/assets/")) {
        responses.push({
          url: resp.url(),
          cacheControl: resp.headers()["cache-control"] || "",
        });
      }
    });
    await page.reload();
    // At least some assets should have long cache
    const cachedAssets = responses.filter((r) => r.cacheControl.includes("max-age"));
    expect(cachedAssets.length).toBeGreaterThan(0);
  });
});
