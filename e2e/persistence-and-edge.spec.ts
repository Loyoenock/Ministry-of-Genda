import { test, expect } from '@playwright/test';

test.describe('Dashboard Filtering, Edge Cases & Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
  });

  test('Search and filter interviews by keyword, tier, and status with clear filter reset', async ({ page }) => {
    // 1. Search by name keyword
    const searchInput = page.getByTestId('dashboard-search-input');
    await searchInput.fill('David Mukiibi');

    // Only David Mukiibi row should be visible
    await expect(page.getByTestId('open-interview-int-002')).toBeVisible();
    await expect(page.getByTestId('open-interview-int-001')).not.toBeVisible();

    // 2. Clear filters button
    await expect(page.getByTestId('dashboard-clear-filters-btn')).toBeVisible();
    await page.getByTestId('dashboard-clear-filters-btn').click();

    // Both rows visible again
    await expect(page.getByTestId('open-interview-int-001')).toBeVisible();
    await expect(page.getByTestId('open-interview-int-002')).toBeVisible();

    // 3. Filter by Tier dropdown
    await page.getByTestId('dashboard-tier-filter').selectOption('Leadership');
    await expect(page.getByTestId('open-interview-int-001')).toBeVisible(); // Leadership
    await expect(page.getByTestId('open-interview-int-002')).not.toBeVisible(); // Management

    // 4. Filter by Status dropdown
    await page.getByTestId('dashboard-tier-filter').selectOption('All Tiers');
    await page.getByTestId('dashboard-status-filter').selectOption('Completed');
    await expect(page.getByTestId('open-interview-int-001')).toBeVisible(); // Completed
    await expect(page.getByTestId('open-interview-int-002')).not.toBeVisible(); // In Progress

    // Reset via Clear button
    await page.getByTestId('dashboard-clear-filters-btn').click();
    await expect(page.getByTestId('open-interview-int-002')).toBeVisible();
  });

  test('Non-matching search term displays clear empty state indicator', async ({ page }) => {
    const searchInput = page.getByTestId('dashboard-search-input');
    await searchInput.fill('XYZNonExistentIntervieweeQuery12345');

    // Verify empty state is rendered
    await expect(page.locator('text=No interviews match the current filter criteria')).toBeVisible();

    // Clear search and ensure records return
    await page.getByTestId('dashboard-clear-filters-btn').click();
    await expect(page.getByTestId('open-interview-int-001')).toBeVisible();
  });

  test('New Interview modal cancels cleanly without state corruption', async ({ page }) => {
    // Open modal
    await page.getByTestId('dashboard-new-interview-btn').click();
    await expect(page.getByTestId('interviewee-name-input')).toBeVisible();

    // Fill partially then click cancel
    await page.getByTestId('interviewee-name-input').fill('Discarded Candidate');
    await page.getByTestId('create-interview-cancel-btn').click();

    // Verify modal is closed
    await expect(page.getByTestId('interviewee-name-input')).not.toBeVisible();

    // Verify discarded candidate was not created
    await expect(page.locator('text=Discarded Candidate')).not.toBeVisible();
  });

  test('Delete interview workflow: cancellation versus permanent confirmation', async ({ page }) => {
    // 1. Create a temporary interview to delete
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Temporary Record To Delete');
    await page.getByTestId('interviewee-role-input').fill('Auditor');
    await page.getByTestId('create-interview-submit-btn').click();

    // Open in form
    await expect(page.getByTestId('delete-interview-btn')).toBeVisible();

    // 2. Click Delete -> Modal opens
    await page.getByTestId('delete-interview-btn').click();
    await expect(page.getByTestId('confirm-delete-modal')).toBeVisible();
    await expect(page.getByTestId('confirm-delete-title')).toContainText('Permanently delete this interview?');

    // 3. Cancel deletion
    await page.getByTestId('cancel-delete-btn').click();
    await expect(page.getByTestId('confirm-delete-modal')).not.toBeVisible();
    await expect(page.getByTestId('interview-tier-badge')).toBeVisible();

    // 4. Click Delete again -> Confirm deletion
    await page.getByTestId('delete-interview-btn').click();
    await expect(page.getByTestId('confirm-delete-modal')).toBeVisible();
    await page.getByTestId('confirm-delete-btn').click();

    // Should return to dashboard and record must no longer exist
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Temporary Record To Delete')).not.toBeVisible();
  });
});
