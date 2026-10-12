import { test, expect } from "@playwright/test";

test("repeated topic quiz interactions remain bounded", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  for (let round = 0; round < 20; round++) {
    await page.goto("/#topic/colors");
    const start = page.locator('[data-a="quiz-topic"]');
    await expect(start).toBeVisible();
    await start.click();
    await expect(page.locator(".question-card")).toBeVisible();
    const answer = page.locator('[data-a="answer"]').first();
    await expect(answer).toBeVisible();
    await answer.click();
    await expect(page.locator('[data-a="next"]')).toBeVisible();
    await page.locator('[data-a="next"]').click();
    await expect(page.locator(".question-card,.result")).toBeVisible();
    if (round % 4 === 0) {
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
        .toBeLessThanOrEqual(1);
      await page.setViewportSize({ width: 390, height: 800 });
    }
  }
});

test("stale controls cannot resurrect a quiz after exit", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  await page.goto("/#topic/colors");
  const start = page.locator('[data-a="quiz-topic"]');
  await expect(start).toBeVisible();
  const staleStart = await start.elementHandle();
  await start.click();
  await expect(page.locator(".question-card")).toBeVisible();
  await page.locator('[data-a="quit-quiz"]').click();
  await expect(page).toHaveURL(/#practice$/);
  await expect(page.locator(".question-card")).toHaveCount(0);
  await staleStart?.evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(page.locator(".question-card")).toHaveCount(0);
});
