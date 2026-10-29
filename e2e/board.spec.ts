import { expect, test } from '@playwright/test';
import { addCard, column, signUp } from './helpers';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test('creates a card that survives a reload', async ({ page }) => {
  await expect(page.getByText('Welcome to your board')).toBeVisible();
  await addCard(page, 'Write docs');
  await expect(page.getByText('Welcome to your board')).toBeHidden();
  await page.reload();
  await expect(column(page, 'Backlog').getByRole('button', { name: 'Write docs' })).toBeVisible();
});

test('validates required fields with inline errors', async ({ page }) => {
  await column(page, 'Backlog').getByRole('button', { name: 'Add card' }).click();
  await page.getByLabel('Name').fill('   ');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Enter a card name.')).toBeVisible();
  await expect(page.getByText('Enter who is responsible.')).toBeVisible();
  await expect(page.getByText('Pick a due date.')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('moves a card with the Move menu and keeps focus on it', async ({ page }) => {
  await addCard(page, 'Write docs');
  const move = page.getByLabel('Move "Write docs" to column');
  await move.selectOption('Done');
  await expect(column(page, 'Done').getByRole('button', { name: 'Write docs' })).toBeVisible();
  await expect(page.getByLabel('Move "Write docs" to column')).toBeFocused();
});

test('moves a card by dragging it to another column', async ({ page }) => {
  await addCard(page, 'Drag me');
  const card = column(page, 'Backlog').getByRole('listitem').first();
  const target = column(page, 'In Progress');
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(column(page, 'In Progress').getByRole('button', { name: 'Drag me' })).toBeVisible();
  await expect(column(page, 'Backlog').getByRole('button', { name: 'Drag me' })).toHaveCount(0);
});

test('deletes a card, restores it with Undo, and focuses a sensible element', async ({ page }) => {
  await addCard(page, 'First');
  await addCard(page, 'Second');
  await page.getByRole('button', { name: 'First' }).click();
  await page.getByRole('button', { name: 'Delete card' }).click();
  await expect(page.getByRole('button', { name: 'First' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Second' })).toBeFocused();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'First' })).toBeVisible();
});

test('closes the dialog with Escape and returns focus to the card', async ({ page }) => {
  await addCard(page, 'Write docs');
  const card = page.getByRole('button', { name: 'Write docs' });
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(card).toBeFocused();
});

test('keeps keyboard focus inside the dialog', async ({ page }) => {
  await column(page, 'Backlog').getByRole('button', { name: 'Add card' }).click();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  expect(inside).toBe(true);
});

test('filters cards by search text and priority', async ({ page }) => {
  await addCard(page, 'Write docs');
  await addCard(page, 'Fix bug');
  await page.getByLabel('Search').fill('bug');
  await expect(page.getByRole('button', { name: 'Fix bug' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write docs' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Priority').selectOption('High');
  await expect(page.getByText('No cards match your filters').first()).toBeVisible();
});

test('flags an overdue card in text, not just colour', async ({ page }) => {
  await addCard(page, 'Late one', 'Backlog', 'Sam', '2020-01-01');
  await expect(page.getByText('Overdue')).toBeVisible();
});

test('does not scroll sideways on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addCard(page, 'Write docs');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
