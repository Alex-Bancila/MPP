import { expect, test } from '@playwright/test'

test('queues a favourite while offline and syncs when back online', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/listings/)

  await context.setOffline(true)
  await expect(page.getByText('Offline')).toBeVisible({ timeout: 10_000 })

  const favouriteButton = page
    .getByRole('button', { name: /add to favourites/i })
    .first()
  await favouriteButton.click()

  await context.setOffline(false)
  // Wait for the navbar connection status to reflect Online or Syncing
  await expect(page.locator('[aria-label="Connection status"]')).toHaveText(/Online|Syncing/, { timeout: 30_000 })
})
