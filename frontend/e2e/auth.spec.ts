import { test, expect } from '@playwright/test'

const CANDIDATE_EMAIL = process.env.PLAYWRIGHT_CANDIDATE_EMAIL ?? ''
const CANDIDATE_PASSWORD = process.env.PLAYWRIGHT_CANDIDATE_PASSWORD ?? ''
const HR_EMAIL = process.env.PLAYWRIGHT_HR_EMAIL ?? ''
const HR_PASSWORD = process.env.PLAYWRIGHT_HR_PASSWORD ?? ''

test.describe('Auth', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login')

    // Logo
    await expect(page.getByRole('img', { name: /jobnova/i }).or(page.locator('[data-testid="logo"]'))).toBeVisible().catch(() =>
      expect(page.locator('header, nav').first()).toBeVisible()
    )

    // Email and password fields
    await expect(page.getByLabel(/البريد الإلكتروني|email/i)).toBeVisible()
    await expect(page.getByLabel(/كلمة المرور|password/i)).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i })).toBeVisible()

    // Google OAuth button
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/البريد الإلكتروني|email/i).fill('invalid@example.com')
    await page.getByLabel(/كلمة المرور|password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click()

    // Error message should appear
    await expect(
      page.getByText(/غير صحيح|invalid|incorrect|خطأ/i)
    ).toBeVisible({ timeout: 10000 })

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to candidate dashboard after successful login', async ({ page }) => {
    test.skip(!CANDIDATE_EMAIL || !CANDIDATE_PASSWORD, 'Candidate credentials not set')

    await page.goto('/login')

    await page.getByLabel(/البريد الإلكتروني|email/i).fill(CANDIDATE_EMAIL)
    await page.getByLabel(/كلمة المرور|password/i).fill(CANDIDATE_PASSWORD)
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click()

    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 15000 })
  })

  test('should redirect to hr dashboard after successful hr login', async ({ page }) => {
    test.skip(!HR_EMAIL || !HR_PASSWORD, 'HR credentials not set')

    await page.goto('/login')

    await page.getByLabel(/البريد الإلكتروني|email/i).fill(HR_EMAIL)
    await page.getByLabel(/كلمة المرور|password/i).fill(HR_PASSWORD)
    await page.getByRole('button', { name: /تسجيل الدخول|login|sign in/i }).click()

    await expect(page).toHaveURL(/\/hr\/dashboard/, { timeout: 15000 })
  })

  test('should redirect unauthenticated users from /candidate/dashboard to /login', async ({ page }) => {
    // Clear any existing cookies to ensure unauthenticated state
    await page.context().clearCookies()

    await page.goto('/candidate/dashboard')

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
