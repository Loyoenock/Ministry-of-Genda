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

  test('Offline mode – answers and notes survive page reload', async ({ page }) => {
    // Force network offline mode
    await page.context().setOffline(true);

    // Create an interview while offline
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Offline Field Inspector');
    await page.getByTestId('interviewee-role-input').fill('Senior Officer');
    await page.getByTestId('tier-option-Management').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Fill questionnaire answer A1
    const testOfflineAnswer = 'Offline response recorded for statutory inspection logs.';
    await page.getByTestId('question-input-A1').fill(testOfflineAnswer);

    // Fill interviewer notes
    await page.getByTestId('tab-notes').click();
    const testOfflineNotes = 'Offline field observation notes recorded locally.';
    await page.getByTestId('notes-observations').fill(testOfflineNotes);

    // Reload page while offline
    await page.reload();

    // Verify questionnaire answer survived reload
    await page.getByTestId('tab-questionnaire').click();
    await expect(page.getByTestId('question-input-A1')).toHaveValue(testOfflineAnswer);

    // Verify notes survived reload
    await page.getByTestId('tab-notes').click();
    await expect(page.getByTestId('notes-observations')).toHaveValue(testOfflineNotes);

    // Restore network connection
    await page.context().setOffline(false);
  });

  test('Document upload size validation still rejects > 50 MB', async ({ page }) => {
    // Navigate to an interview's Documents tab
    await page.getByTestId('open-interview-int-001').click();
    await page.getByTestId('tab-documents').click();

    // Attempt uploading an oversized file via file input
    const fileInput = page.locator('input[aria-label="Upload document file"]');
    const oversizedBuffer = Buffer.alloc(51 * 1024 * 1024); // 51 MB

    await fileInput.setInputFiles({
      name: 'oversized_register.pdf',
      mimeType: 'application/pdf',
      buffer: oversizedBuffer,
    });

    // Assert error message displayed by DocumentsTab
    await expect(
      page.locator('text=Upload failed: File exceeds the 50MB maximum size limit allowed by the Directorate repository.')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Live mode – checklist item file upload and signed URL retrieval', async ({ page }) => {
    // Check if live Supabase environment is configured
    const isConfigured = await page.evaluate(() => {
      return Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
    });

    if (!isConfigured) {
      test.skip(!isConfigured, 'Skipping live upload test: Supabase environment variables not set');
      return;
    }

    // Navigate to an interview's Documents tab
    await page.getByTestId('open-interview-int-001').click();
    await page.getByTestId('tab-documents').click();

    // Trigger file input upload for checklist item
    const fileInput = page.locator('input[aria-label="Upload document file"]');
    await fileInput.setInputFiles({
      name: 'statutory_log_evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 statutory test content'),
    });

    // Assert success message and checklist item row state
    await expect(page.locator('text=File uploaded successfully')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('checklist-item-1')).toBeVisible();
  });
});
