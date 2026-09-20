import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Management Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to guarantee fresh state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('Demo login as interviewer grants access and displays dashboard', async ({ page }) => {
    await expect(page.getByTestId('login-demo-interviewer-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('login-demo-interviewer-btn').click();

    // Verify successful login onto dashboard
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('header-user-menu-btn')).toBeVisible();

    // Verify interviewer persona credentials in header
    await expect(page.getByTestId('header-user-role-badge')).toContainText('John');
    await expect(page.getByTestId('header-user-role-badge')).toContainText('Interviewer');

    // Admin section should NOT be visible for standard interviewer
    await expect(page.getByTestId('sidebar-admin-section')).not.toBeVisible();
  });

  test('Demo login as admin grants full oversight and admin navigation', async ({ page }) => {
    await expect(page.getByTestId('login-demo-admin-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('login-demo-admin-btn').click();

    // Verify dashboard and admin features
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('sidebar-admin-section')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-analytics')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-users')).toBeVisible();

    // Verify Admin badge in header
    await expect(page.getByTestId('header-user-role-badge')).toContainText('ADMIN');
  });

  test('Logout clears session and returns to login view', async ({ page }) => {
    // First login
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible();

    // Click user menu and sign out
    await page.getByTestId('header-user-menu-btn').click();
    await expect(page.getByTestId('header-sign-out-btn')).toBeVisible();
    await page.getByTestId('header-sign-out-btn').click();

    // Verify login view is restored
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await expect(page.getByTestId('dashboard-search-input')).not.toBeVisible();

    // Verify local storage is cleared
    const storedUser = await page.evaluate(() => localStorage.getItem('mglsd_demo_user'));
    expect(storedUser).toBeNull();
  });

  test('Page refresh retains session in Demo mode', async ({ page }) => {
    // Login as interviewer
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible();

    // Reload page
    await page.reload();

    // Session remains active
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('login-submit-btn')).not.toBeVisible();
    await expect(page.getByTestId('header-user-role-badge')).toContainText('John');
  });

  test('Invalid login shows descriptive validation error alert', async ({ page }) => {
    await expect(page.getByTestId('login-email')).toBeVisible();

    // Try submitting empty
    await page.getByTestId('login-submit-btn').click();
    // HTML5 or JS validation will show or alert will show
    // Try submitting malformed email
    await page.getByTestId('login-email').fill('invalid-email-format');
    await page.getByTestId('login-submit-btn').click();

    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText('valid ministry email');
  });
});
