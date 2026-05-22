import { expect, test } from '@playwright/test'

test('activity cookie persists preferences after reload', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/listings/)

  await page.getByLabel('Search listings').fill('vinyl')
  await page.getByRole('tab', { name: 'Listening' }).click()

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const key = 'music-core.activity='
        const rawCookie = document.cookie
          .split(';')
          .map((entry) => entry.trim())
          .find((entry) => entry.startsWith(key))

        if (!rawCookie) {
          return false
        }

        try {
          const decoded = decodeURIComponent(rawCookie.slice(key.length))
          const parsed = JSON.parse(decoded) as {
            payload?: {
              lastSearch?: string
              preferredCategory?: string
            }
          }

          return (
            parsed.payload?.lastSearch === 'vinyl' &&
            parsed.payload?.preferredCategory === 'Listening'
          )
        } catch {
          return false
        }
      })
    })
    .toBe(true)

  await page.reload()

  await expect(page.getByLabel('Search listings')).toHaveValue('vinyl')
})
