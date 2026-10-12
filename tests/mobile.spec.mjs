import { test, expect } from "@playwright/test";

test("main routes render usable content", async ({ page }) => {
  for (const route of ["home", "learn", "practice", "exam", "progress", "mistakes"]) {
    await page.goto("/#" + route);
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator("#app")).not.toBeEmpty();
  }
  await expect(page.locator(".home-heading")).toHaveCount(0);
  await page.goto("/#home");
  await expect(page.locator(".home-heading")).toBeVisible();
});

test("textbook catalogue exposes ten ordered lessons with page references", async ({ page }) => {
  await page.goto("/#learn");
  await expect(page.locator(".curriculum-card")).toHaveCount(10);
  await expect(page.locator(".curriculum-card").nth(0)).toContainText("۱۱–۲۲");
  await expect(page.locator(".curriculum-card").nth(9)).toContainText("۱۲۷–۱۳۶");
  await page.locator('[data-a="lesson"][data-id="2"]').click();
  await expect(page.locator(".curriculum-lesson")).toBeVisible();
  await expect(page.locator(".guide-card")).toHaveCount(3);
  await expect(page.locator(".word-grid .word")).toHaveCount(6);
  await expect(page.locator('[data-a="lesson-quiz"]')).toBeVisible();
});

test("lesson progress is stored separately and whole-book exam draws from completed lessons", async ({ page }) => {
  await page.goto("/#learn");
  await page.evaluate(() => localStorage.setItem("arabic8-curriculum-progress-v1", JSON.stringify({
    lessons: {
      2: { correct: 4, total: 5, percent: 80, attempts: 1, completed: true },
      3: { correct: 5, total: 5, percent: 100, attempts: 1, completed: true }
    },
    bookExams: []
  })));
  await page.goto("/#book-exam");
  await expect(page.locator(".curriculum-card")).toHaveCount(2);
  await page.locator('[data-a="book-exam-start"]').click();
  await expect(page.locator(".question-card")).toBeVisible();
  await expect(page.locator(".exam-nav button")).toHaveCount(10);
  const lessonLabels = await page.locator(".exam-nav").evaluate(el => el.parentElement.innerText);
  expect(lessonLabels).toContain("آزمون کل کتاب");
});

test("responsive layouts do not create horizontal overflow", async ({ page }) => {
  for (const width of [320, 360, 390, 800]) {
    await page.setViewportSize({ width, height: width === 800 ? 390 : 800 });
    for (const route of ["home", "learn", "practice"]) {
      await page.goto("/#" + route);
      await expect(page.locator("#app")).not.toBeEmpty();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        `horizontal overflow at ${width}px on #${route}`
      ).toBeLessThanOrEqual(1);
    }
  }
});

test("accessibility basics and keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#home");
  await expect(page.locator(".skip-link")).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const unlabeledButtons = await page.locator("button").evaluateAll(buttons =>
    buttons.filter(button =>
      !(button.innerText || "").trim() &&
      !button.getAttribute("aria-label") &&
      !button.getAttribute("title")
    ).length
  );
  expect(unlabeledButtons).toBe(0);
  expect(await page.locator("input,select,textarea").evaluateAll(elements =>
    elements.filter(element =>
      !element.labels?.length &&
      !element.getAttribute("aria-label") &&
      !element.getAttribute("aria-labelledby")
    ).length
  )).toBe(0);
});

test("corrupted saved progress is normalized safely", async ({ page }) => {
  const badValues = [
    null, {}, [], "banana", -999999999,
    { xp: "💀" },
    { streak: { current: "🔥", best: -1, lastActive: "yesterday" } },
    { topicScores: { x: { correct: 999, total: 1 } }, review: { x: { interval: Infinity, due: "banana" } } },
    { examAttempts: [null, {}, { correct: 99, total: -2 }], completedTopics: ["x", "x", 9], mistakes: ["x", 9] }
  ];
  for (const value of badValues) {
    await page.goto("/#progress");
    await page.evaluate(v => localStorage.setItem("arabic8-lesson1-progress-v4", JSON.stringify(v)), value);
    await page.reload();
    await expect(page.locator(".dashboard-grid")).toBeVisible();
    const progress = await page.evaluate(async () => {
      const storage = await import("/js/storage.js");
      return storage.loadProgress();
    });
    expect(progress.version).toBe(4);
    expect(Number.isFinite(progress.xp)).toBeTruthy();
    expect(Array.isArray(progress.completedTopics)).toBeTruthy();
    expect(Array.isArray(progress.mistakes)).toBeTruthy();
    expect(typeof progress.review).toBe("object");
  }
});

test("exam starts with 20 navigable questions", async ({ page }) => {
  await page.goto("/#exam");
  await page.getByRole("button", { name: "شروع آزمون" }).click();
  await expect(page.locator(".question-card")).toBeVisible();
  await expect(page.locator(".exam-nav button")).toHaveCount(20);
  for (const index of [19, 0, 5, 10]) {
    await page.locator('.exam-nav button[data-i="' + index + '"]').click();
    await expect(page.locator(".question-card")).toBeVisible();
    await expect(page.locator(".question-meta")).toContainText("سؤال " + (index + 1) + " از 20");
  }
});

test("mistake review renders questions saved in local progress", async ({ page }) => {
  await page.goto("/#home");
  const questionId = await page.evaluate(async () => {
    const module = await import("/js/data/questions.js");
    return module.questions.find(question => question.topic === "colors")?.id;
  });
  expect(questionId).toBeTruthy();
  await page.evaluate(id => {
    const progress = {
      version: 4, diagnostic: null, topicScores: {}, topicRecent: {},
      completedTopics: [], examAttempts: [], mistakes: [id],
      review: { [id]: { interval: 1, ease: 2.3, due: "2000-01-01T00:00:00.000Z", streak: 0, wrongCount: 2 } },
      xp: 0, streak: { current: 0, best: 0, lastActive: null },
      daily: { date: "2000-01-01", xp: 0, goal: 20, completed: false }, achievements: []
    };
    localStorage.setItem("arabic8-lesson1-progress-v4", JSON.stringify(progress));
  }, questionId);
  await page.reload();
  await page.goto("/#mistakes");
  await expect(page.locator(".review-item").first()).toBeVisible();
  await page.locator('button[data-a="mistake-quiz"]').click();
  await expect(page.locator(".question-card")).toBeVisible();
});

test("storage write failures are reported without throwing", async ({ page }) => {
  await page.goto("/#progress");
  const result = await page.evaluate(async () => {
    const storage = await import("/js/storage.js");
    const original = Storage.prototype.setItem;
    try {
      Storage.prototype.setItem = () => { throw new Error("quota"); };
      return storage.saveProgress(storage.loadProgress());
    } finally {
      Storage.prototype.setItem = original;
    }
  });
  expect(result).toBe(false);
});

test("service worker shell cache contains the app entry point", async ({ page }) => {
  await page.goto("/#home");
  const result = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { supported: false };
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve => setTimeout(() => resolve(null), 8000))
    ]);
    if (!registration) return { supported: true, ready: false };
    const keys = await caches.keys();
    const cacheNames = keys.filter(key => key.startsWith("arabic8-lesson1-shell-"));
    let indexCached = false;
    for (const key of cacheNames) {
      const cache = await caches.open(key);
      if (await cache.match(new URL("./index.html", location.href))) indexCached = true;
    }
    return { supported: true, ready: true, cacheNames, indexCached };
  });
  expect(result.supported).toBeTruthy();
  expect(result.ready).toBeTruthy();
  expect(result.indexCached).toBeTruthy();
});
