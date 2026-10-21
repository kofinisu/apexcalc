import { test, expect } from '@playwright/test';

// test/index.html runs every *.test.js module in the page and marks each result .pass or .fail.
test('in-page unit tests all pass', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/test/index.html'); // resolves after the module scripts have run
  expect(errors).toEqual([]);
  expect(await page.locator('#results .fail').allTextContents()).toEqual([]);
  expect(await page.locator('#results .pass').count()).toBeGreaterThan(20);
});

test('typing in an expression box keeps focus and does not trigger shortcuts', async ({ page }) => {
  await page.goto('/index.html');
  const input = page.locator('.expr-input').first();
  await input.fill('');
  await page.keyboard.type('sin(x)+2*m', { delay: 10 });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('sin(x)+2*m');
  await expect(page.locator('.tab.active')).toHaveAttribute('data-tab', '2d');
});

test('solver panel solves, and clearing the input does not crash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/index.html');
  await page.click('.tab[data-tab="solver"]');
  await page.fill('#solverInput', 'x^2 - 5x + 6 = 0');
  await expect(page.locator('#solverOutput .solver-answer')).toContainText('x = 2, x = 3');
  await page.fill('#solverInput', '');
  await expect(page.locator('#solverOutput .solver-placeholder')).toBeVisible();
  expect(errors).toEqual([]);
});
