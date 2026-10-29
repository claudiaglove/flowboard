import { expect, test } from '@playwright/test';
import { passwordField, signUp } from './helpers';

test('rejects a wrong password with a clear error tied to the field', async ({ page }) => {
  await signUp(page, 'sam@example.com', 'correct-horse-battery');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email Address').fill('sam@example.com');
  await passwordField(page).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
  await expect(passwordField(page)).toHaveAttribute('aria-invalid', 'true');
});

test('signs in again after signing out, and keeps the session across a reload', async ({ page }) => {
  await signUp(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Team Board' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'FlowBoard' })).toBeVisible();
  await page.getByLabel('Email Address').fill('sam@example.com');
  await passwordField(page).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Team Board' })).toBeVisible();
});

test('does not store the password in the clear', async ({ page }) => {
  await signUp(page, 'sam@example.com', 'correct-horse-battery');
  const stored = await page.evaluate(() => localStorage.getItem('flowboard-users'));
  expect(stored).not.toContain('correct-horse-battery');
});

test('a magic link cannot sign in to a password-protected account', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Magic link' }).click();
  await page.getByLabel('Email Address').fill('sam@example.com');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('alert')).toContainText('Use the Password tab');
});

test('keeps each user on their own board', async ({ page }) => {
  await signUp(page, 'one@example.com');
  await page.getByRole('region', { name: /^Backlog,/ }).getByRole('button', { name: 'Add card' }).click();
  await page.getByLabel('Name').fill('Only for one');
  await page.getByLabel('Assignee').fill('One');
  await page.getByLabel('Due date').fill('2030-05-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await page.getByLabel('Email Address').fill('two@example.com');
  await passwordField(page).fill('another-long-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Team Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Only for one' })).toHaveCount(0);
});
