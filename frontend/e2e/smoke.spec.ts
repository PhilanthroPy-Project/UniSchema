import { expect, test } from '@playwright/test'

test.describe('UniSchema admin UI smoke', () => {
  test('mapping canvas loads with vendor select', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /UniSchema Mapper/i })).toBeVisible()
    await expect(page.getByTestId('vendor-select')).toBeVisible()
  })

  test('vendor select lists GiveCampus', async ({ page }) => {
    await page.goto('/')
    const select = page.getByTestId('vendor-select')
    await expect(select.locator('option')).toContainText(['GiveCampus'])
  })

  test('drift queue tab navigates', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Drift Queue/i }).click()
    await expect(page.getByRole('heading', { name: /Drift Queue/i })).toBeVisible()
  })

  test('first-run wizard can be dismissed', async ({ page }) => {
    await page.goto('/')
    const wizard = page.getByTestId('first-run-wizard')
    if (await wizard.isVisible()) {
      await page.getByRole('button', { name: /Get started/i }).click()
      await expect(wizard).not.toBeVisible()
    }
  })
})
