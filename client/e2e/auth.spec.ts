import { expect, test } from '@playwright/test'

test('login authenticates and reaches listings', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/listings/)

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password/)

  await page.getByRole('button', { name: 'Back to Login' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByRole('link', { name: 'Browse' }).click()
  await expect(page).toHaveURL(/\/listings/)
})

test('register authenticates and supports logout', async ({ page }) => {
  const nonce = Date.now()

  await page.goto('/register')

  await page.getByLabel('Username').fill(`mock_user_${nonce}`)
  await page.getByLabel('Email').fill(`mock_${nonce}@musiccore.local`)
  await page.getByLabel('Password', { exact: true }).fill('MockPass123!')
  await page.getByLabel('Confirm Password').fill('MockPass123!')
  await page.getByRole('main').getByRole('button', { name: 'Register' }).click()

  await expect(page).toHaveURL(/\/listings/)

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/\/login/)
})
