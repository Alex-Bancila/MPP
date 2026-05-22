import { expect, test } from '@playwright/test'

test('listing create, update, delete flow', async ({ page }) => {
  const title = `Test Listing ${Date.now()}`

  await page.goto('/listings')
  await expect(page).toHaveURL(/\/listings/)

  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@musiccore.local')
  await page.getByLabel('Password').fill('RiffMaster123!')
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/listings/)

  await page.getByRole('button', { name: 'Sell' }).click()
  await expect(page).toHaveURL(/\/listings\/new/)

  await page.getByLabel('Title').fill(title)
  await page
    .getByLabel('Description')
    .fill('Clean condition listing used for e2e validation with enough details.')
  await page.getByLabel('Price (RON)').fill('1200')
  await page.getByLabel('Category').selectOption('Creating')
  await page.getByLabel('Photos').fill('https://picsum.photos/seed/e2e/1200/900')
  await page.getByRole('button', { name: 'Create listing' }).click()

  await expect(page).toHaveURL(/\/listings$/)
  await expect(page.getByText(title)).toBeVisible()

  await page.getByLabel('Search listings').fill(title)
  await page.getByText(title).first().click()

  await expect(page).toHaveURL(/\/listings\//)
  await page.getByRole('button', { name: 'Edit Listing' }).click()

  await page.getByLabel('Price (RON)').fill('1337')
  await page.getByRole('combobox', { name: /^Status$/ }).selectOption('Sold')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page).toHaveURL(/\/listings$/)
  await page.getByLabel('Search listings').fill(title)
  await expect(page.getByText(title)).toBeVisible()

  await page.getByText(title).first().click()
  await page.getByRole('button', { name: 'Delete Listing' }).click()

  const dialog = page.getByRole('dialog', { name: 'Delete listing' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page).toHaveURL(/\/listings$/)
  await page.getByLabel('Search listings').fill(title)
  await expect(page.getByText('No listings match your filters yet.')).toBeVisible()
})
