import { expect, type Page } from '@playwright/test';

// The tab panel is also named "Password", so address the field itself.
export const passwordField = (page: Page) => page.locator('input[type="password"]');

export async function signUp(page: Page, email = 'sam@example.com', password = 'correct-horse-battery') {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await page.getByLabel('Email Address').fill(email);
  await passwordField(page).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Team Board' })).toBeVisible();
}

export async function addCard(page: Page, name: string, column = 'Backlog', assignee = 'Sam', due = '2030-05-01') {
  await page.getByRole('region', { name: new RegExp(`^${column},`) }).getByRole('button', { name: 'Add card' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Assignee').fill(assignee);
  await page.getByLabel('Due date').fill(due);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

export const column = (page: Page, name: string) => page.getByRole('region', { name: new RegExp(`^${name},`) });
