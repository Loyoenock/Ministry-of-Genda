import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) & Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('Interviewer cannot view admin-only sidebar navigation or controls', async ({ page }) => {
    // Login as Interviewer John Okello
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });

    // Admin-only sections must NOT be rendered
    await expect(page.getByTestId('sidebar-admin-section')).not.toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-analytics')).not.toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-users')).not.toBeVisible();

    // Standard interviewer navigation items must be available
    await expect(page.getByTestId('sidebar-nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-interviews')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-documents')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-notes')).toBeVisible();
  });

  test('Admin has access to all oversight modules including Analytics and User Management', async ({ page }) => {
    // Login as Admin Florence Nsubuga
    await page.getByTestId('login-demo-admin-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });

    // Admin navigation must be present
    await expect(page.getByTestId('sidebar-admin-section')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-analytics')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-admin-users')).toBeVisible();

    // Navigate to Analytics Report
    await page.getByTestId('sidebar-nav-admin-analytics').click();
    await expect(page.locator('text=National Labour Directorate Assessment Dossier')).toBeVisible({ timeout: 7000 });

    // Navigate to User Management
    await page.getByTestId('sidebar-nav-admin-users').click();
    await expect(page.locator('text=Directorate Officer & Interviewer Directory')).toBeVisible({ timeout: 7000 });
  });

  test('Dynamic role switching via header updates privileges seamlessly', async ({ page }) => {
    // Start as Interviewer
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible();
    await expect(page.getByTestId('sidebar-admin-section')).not.toBeVisible();

    // Open User Menu dropdown and switch to Admin
    await page.getByTestId('header-user-menu-btn').click();
    await expect(page.getByTestId('header-switch-role-admin')).toBeVisible();
    await page.getByTestId('header-switch-role-admin').click();

    // Verify Admin privileges applied
    await expect(page.getByTestId('sidebar-admin-section')).toBeVisible();
    await expect(page.getByTestId('header-user-role-badge')).toContainText('ADMIN');

    // Switch back to Interviewer
    await page.getByTestId('header-user-menu-btn').click();
    await expect(page.getByTestId('header-switch-role-interviewer')).toBeVisible();
    await page.getByTestId('header-switch-role-interviewer').click();

    // Verify privileges revoked
    await expect(page.getByTestId('sidebar-admin-section')).not.toBeVisible();
    await expect(page.getByTestId('header-user-role-badge')).toContainText('Interviewer');
  });

  test('Interviewer cannot modify or delete an interview owned by another officer (Read-Only Mode)', async ({ page }) => {
    // 1. Seed an interview owned by another interviewer
    const otherInterview = {
      id: 'int-other-officer-999',
      interviewee_name: 'Dr. Charles Katureebe',
      role_title: 'Senior Occupational Safety Inspector',
      department_unit: 'Department of OSH',
      years_in_role: 4,
      interview_date: '16 Sep 2025',
      interview_time: '02:00 PM',
      location: 'Mbarara Regional Office',
      interviewer_id: 'usr-other-different-officer',
      interviewer_name: 'Grace Atuhaire',
      tier: 'Management',
      status: 'In Progress',
      completion_percentage: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in localStorage
    await page.evaluate((item) => {
      const existing = localStorage.getItem('mglsd_interviews');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(item);
      localStorage.setItem('mglsd_interviews', JSON.stringify(list));
    }, otherInterview);

    // 2. Login as Admin first to locate the interview
    await page.getByTestId('login-demo-admin-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible();

    // Open the other officer's interview
    await page.getByTestId(`open-interview-${otherInterview.id}`).click();
    await expect(page.getByTestId('interview-tier-badge')).toBeVisible();

    // As Admin, canModify is true (delete button is present)
    await expect(page.getByTestId('delete-interview-btn')).toBeVisible();

    // 3. Now switch to Interviewer role (who is NOT the owner)
    await page.getByTestId('header-user-menu-btn').click();
    await page.getByTestId('header-switch-role-interviewer').click();

    // Verify Read-Only Mode enforcement:
    // Read-only badge must be displayed
    await expect(page.getByTestId('readonly-badge')).toBeVisible();

    // Danger delete button must be hidden
    await expect(page.getByTestId('delete-interview-btn')).not.toBeVisible();

    // Status buttons must be disabled
    await expect(page.getByTestId('status-btn-draft')).toBeDisabled();
    await expect(page.getByTestId('status-btn-in-progress')).toBeDisabled();
    await expect(page.getByTestId('status-btn-completed')).toBeDisabled();
  });
});
