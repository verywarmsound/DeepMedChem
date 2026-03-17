import { test, expect } from "@playwright/test";

test.describe("Viewer3D rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for 3Dmol.js script to load
    await page.waitForFunction(() => '$3Dmol' in window, null, {
      timeout: 15_000,
    });
  });

  test("page loads with viewer placeholder visible", async ({ page }) => {
    // Viewer container should exist
    const viewer = page.locator(".aspect-video");
    await expect(viewer).toBeVisible();

    // Legend labels should be visible
    await expect(page.getByText("Reference Molecule")).toBeVisible();
    await expect(page.getByText("Probe Molecule")).toBeVisible();

    // No "Show Controls" yet (no result loaded)
    await expect(page.getByText("Show Controls")).not.toBeVisible();
  });

  test("alignment runs and viewer shows controls and pager", async ({
    page,
  }) => {
    const runButton = page.getByRole("button", { name: /run alignment/i });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Loading state should appear
    await expect(
      page.getByText("Generating conformers & aligning...")
    ).toBeVisible();

    // Wait for results — pager buttons should appear
    const pagerBtn1 = page.locator("button", { hasText: "1" }).last();
    await expect(pagerBtn1).toBeVisible({ timeout: 90_000 });

    // "Show Controls" button should now be visible (proves result loaded)
    await expect(page.getByText("Show Controls")).toBeVisible();

    // 3Dmol should have created a canvas somewhere in the viewer container
    // (it may be nested in divs created by 3Dmol.js)
    const canvas = page.locator(".aspect-video canvas");
    const canvasCount = await canvas.count();
    // In headless mode without GPU, 3Dmol may not create a canvas,
    // so we just verify the pager and controls rendered correctly
    if (canvasCount > 0) {
      const box = await canvas.first().boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(50);
      expect(box!.height).toBeGreaterThan(50);
    }
  });

  test("pager navigation switches between results", async ({ page }) => {
    const runButton = page.getByRole("button", { name: /run alignment/i });
    await runButton.click();

    // Wait for result
    const pagerBtn2 = page.locator("button", { hasText: "2" }).last();
    await expect(pagerBtn2).toBeVisible({ timeout: 90_000 });

    // Click result 2
    await pagerBtn2.click();

    // Button 2 should now be active (has bg-primary class)
    await expect(pagerBtn2).toHaveClass(/bg-primary/);
  });
});

test.describe("Viewer controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => '$3Dmol' in window, null, {
      timeout: 15_000,
    });

    // Run alignment and wait for result
    const runButton = page.getByRole("button", { name: /run alignment/i });
    await runButton.click();
    const pagerBtn1 = page.locator("button", { hasText: "1" }).last();
    await expect(pagerBtn1).toBeVisible({ timeout: 90_000 });
  });

  test("opacity sliders are visible when controls expanded", async ({
    page,
  }) => {
    await page.getByText("Show Controls").click();
    await expect(page.getByText("Hide Controls")).toBeVisible();

    await expect(page.getByText("Reference Opacity")).toBeVisible();
    await expect(page.getByText("Probe Opacity")).toBeVisible();

    const opacityValues = page.getByText("100%");
    await expect(opacityValues).toHaveCount(2);
  });

  test("opacity slider changes value", async ({ page }) => {
    await page.getByText("Show Controls").click();

    const refSlider = page.locator('input[type="range"]').first();
    await refSlider.fill("30");

    await expect(page.getByText("30%")).toBeVisible();
  });

  test("translation controls are visible", async ({ page }) => {
    await page.getByText("Show Controls").click();

    await expect(page.getByText("Move Reference")).toBeVisible();
    await expect(page.getByRole("button", { name: "X-" })).toBeVisible();
    await expect(page.getByRole("button", { name: "X+" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Y-" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Y+" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Z-" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Z+" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset Position" })
    ).toBeVisible();
  });

  test("translation buttons update offset display", async ({ page }) => {
    await page.getByText("Show Controls").click();

    // Offsets are the spans between the +/- buttons in the grid
    const xOffset = page
      .locator(".grid.grid-cols-3 > span")
      .nth(0);
    const yOffset = page
      .locator(".grid.grid-cols-3 > span")
      .nth(1);

    // Initial X offset should be 0.0
    await expect(xOffset).toHaveText("0.0");

    // Click X+ button
    await page.getByRole("button", { name: "X+" }).click();
    await expect(xOffset).toHaveText("0.3");

    // Click X+ again
    await page.getByRole("button", { name: "X+" }).click();
    await expect(xOffset).toHaveText("0.6");

    // Y should still be 0.0
    await expect(yOffset).toHaveText("0.0");

    // Reset — all offsets go back to 0.0
    await page.getByRole("button", { name: "Reset Position" }).click();
    // Wait for state update
    await expect(xOffset).toHaveText("0.0", { timeout: 5_000 });
  });

  test("controls panel can be toggled", async ({ page }) => {
    // Open
    await page.getByText("Show Controls").click();
    await expect(page.getByText("Reference Opacity")).toBeVisible();

    // Close
    await page.getByText("Hide Controls").click();
    await expect(page.getByText("Reference Opacity")).not.toBeVisible();
    await expect(page.getByText("Show Controls")).toBeVisible();
  });
});

test.describe("Results table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    const runButton = page.getByRole("button", { name: /run alignment/i });
    await runButton.click();

    // Wait for results table to appear — use column header role to avoid
    // matching the StatsPanel which also shows these labels
    await expect(
      page.getByRole("columnheader", { name: "Alignment Score" })
    ).toBeVisible({ timeout: 90_000 });
  });

  test("results table shows all columns", async ({ page }) => {
    await expect(
      page.getByRole("columnheader", { name: "Alignment Score" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Shape Tanimoto" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "RMSD" })
    ).toBeVisible();
  });

  test("clicking a table row updates the viewer", async ({ page }) => {
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);

    await rows.nth(1).click();

    // Pager button 2 should now be active
    const pagerBtn2 = page.locator("button", { hasText: "2" }).last();
    await expect(pagerBtn2).toHaveClass(/bg-primary/);
  });
});
