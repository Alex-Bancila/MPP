import { expect, test } from '@playwright/test'

test('statistics table and charts stay in sync on the same page', async ({ page }) => {
  const title = `Stats Sync ${Date.now()}`

  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/listings/)

  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page).toHaveURL(/\/stats/)
  await expect(page.getByRole('heading', { name: 'Category Breakdown' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Listings by Category' })).toBeVisible()

  const creatingRow = page.locator('.mc-listing-table tbody tr', { hasText: 'Creating' })
  const countCell = creatingRow.locator('td').nth(1)
  const beforeText = await countCell.textContent()
  const beforeCount = Number((beforeText ?? '').replace(/\D/g, ''))

  await page.getByLabel('Demo listing title').fill(title)
  await page.locator('article.mc-stats-card select').selectOption('Creating')
  await page.getByRole('button', { name: 'Add demo listing' }).click()

  await expect(page.getByText(/watch the category table and charts update/i)).toBeVisible()
  await expect(countCell).toHaveText(String(beforeCount + 1))

  const rankingRow = page.locator('.mc-top-sellers__item', { hasText: 'alex_riffs' })
  const sellerCountBefore = Number(
    ((await rankingRow.locator('.mc-top-sellers__count').textContent()) ?? '').replace(/\D/g, ''),
  )
  // The count element includes the word "listings" (e.g. "20 listings").
  // Assert the numeric count has increased by at least 1. Tests run in parallel
  // so other activity may also increase the count.
  await expect
    .poll(async () =>
      Number(((await rankingRow.locator('.mc-top-sellers__count').textContent()) ?? '').replace(/\D/g, '')),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(sellerCountBefore)
})
