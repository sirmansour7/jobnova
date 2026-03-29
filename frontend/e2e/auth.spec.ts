import { test, expect } from '@playwright/test'

const CANDIDATE_EMAIL = process.env.PLAYWRIGHT_CANDIDATE_EMAIL ?? ''
const CANDIDATE_PASSWORD = process.env.PLAYWRIGHT_CANDIDATE_PASSWORD ?? ''
const HR_EMAIL = process.env.PLAYWRIGHT_HR_EMAIL ?? ''
const HR_PASSWORD = process.env.PLAYWRIGHT_HR_PASSWORD ?? ''

test.describe('Auth', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible()
    await expect(page.getByText('تسجيل الدخول بـ Google')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('example@email.com').fill('wrong@email.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

    await expect(
      page.locator('[data-sonner-toast]').or(page.locator('[role="alert"]'))
    ).toBeVisible({ timeout: 10000 })

    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to candidate dashboard after successful login', async ({ page }) => {
    test.skip(!CANDIDATE_EMAIL || !CANDIDATE_PASSWORD, 'Candidate credentials not set')

    await page.goto('/login')

    await page.getByPlaceholder('example@email.com').fill(CANDIDATE_EMAIL)
    await page.locator('input[type="password"]').fill(CANDIDATE_PASSWORD)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

    await page.waitForResponse(resp => resp.url().includes('/v1/auth/login'), { timeout: 10000 })

    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 15000 })
  })

  test('should redirect to hr dashboard after successful hr login', async ({ page }) => {
    test.skip(!HR_EMAIL || !HR_PASSWORD, 'HR credentials not set')

    await page.goto('/login')

    await page.getByPlaceholder('example@email.com').fill(HR_EMAIL)
    await page.locator('input[type="password"]').fill(HR_PASSWORD)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

    await expect(page).toHaveURL(/\/hr\/dashboard/, { timeout: 15000 })
  })

  test('should redirect unauthenticated users from /candidate/dashboard to /login', async ({ page }) => {
    await page.context().clearCookies()

    await page.goto('/candidate/dashboard')

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
