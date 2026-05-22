import { expect, test } from '@playwright/test'

test('server generator updates statistics while running', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()

  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page).toHaveURL(/\/stats/)

  // Use the category row counts rather than row count (rows are fixed per category)
  const creatingRow = page.locator('.mc-listing-table tbody tr', { hasText: 'Creating' })
  const countCell = creatingRow.locator('td').nth(1)
  const beforeText = await countCell.textContent()
  const beforeCount = Number((beforeText ?? '').replace(/\D/g, ''))

  await page.getByRole('button', { name: 'Start generator' }).click()
  await expect(page.getByText('Running')).toBeVisible()

  // Wait for the Creating count to increase
  await expect
    .poll(async () => Number(((await countCell.textContent()) ?? '').replace(/\D/g, '')), { timeout: 30_000 })
    .toBeGreaterThan(beforeCount)

  await page.getByRole('button', { name: 'Stop generator' }).click()
  await expect(page.getByText('Stopped')).toBeVisible()
})
