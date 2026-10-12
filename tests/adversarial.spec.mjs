import { test, expect } from "@playwright/test";

async function answerCurrentQuestion(page) {
  const choice = page.locator('[data-a="answer"]');
  if (await choice.count()) {
    await choice.first().click();
    return;
  }
  const binary = page.locator('[data-a="binary"]');
  if (await binary.count()) {
    await binary.first().click();
    return;
  }
  const word = page.locator('[data-a="word"]');
  if (await word.count()) {
    await word.first().click();
    await page.locator('[data-a="submit-word"]').click();
    return;
  }
  const order = page.locator('[data-a="order"]');
  if (await order.count()) {
    const count = await order.count();
    for (let i = 0; i < count; i++) await page.locator('[data-a="order"]').first().click();
    await page.locator('[data-a="submit-order"]').click();
    return;
  }
  const left = page.locator('[data-a="match-left"]');
  const right = page.locator('[data-a="match-right"]');
  if (await left.count()) {
    const count = await left.count();
    for (let i = 0; i < count; i++) {
      await page.locator('[data-a="match-left"]').nth(i).click();
      await page.locator('[data-a="match-right"]').nth(i).click();
    }
    await page.locator('[data-a="submit-match"]').click();
    return;
  }
  throw new Error("No supported answer control was rendered for the current question");
}

test("topic quiz supports answer and next navigation", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  await page.goto("/#topic/colors");
    const start = page.locator('[data-a="quiz-topic"]');
    await expect(start).toBeVisible();
    await start.click();
    await expect(page.locator(".question-card")).toBeVisible();
    await answerCurrentQuestion(page);
    await expect(page.locator('[data-a="next"]')).toBeVisible();
    await page.locator('[data-a="next"]').click();
    await expect(page.locator(".question-card,.result")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
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
