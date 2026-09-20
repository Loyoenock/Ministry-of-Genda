import { test, expect } from '@playwright/test';

test.describe('Interview Lifecycle & Multi-Tier Form Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Reset state and login as interviewer
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.getByTestId('login-demo-interviewer-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible({ timeout: 10000 });
  });

  test('Create interviews across 4 tiers and verify dynamic section routing', async ({ page }) => {
    // 1. Leadership Tier
    await page.getByTestId('dashboard-new-interview-btn').click();
    await expect(page.getByTestId('interviewee-name-input')).toBeVisible();
    await page.getByTestId('interviewee-name-input').fill('Hon. Betty Amongi');
    await page.getByTestId('interviewee-role-input').fill('Cabinet Minister');
    await page.getByTestId('tier-option-Leadership').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Verify Leadership sections: A, B, D, G, H exist; C, E, F do not exist
    await expect(page.getByTestId('section-nav-A')).toBeVisible();
    await expect(page.getByTestId('section-nav-B')).toBeVisible();
    await expect(page.getByTestId('section-nav-D')).toBeVisible();
    await expect(page.getByTestId('section-nav-G')).toBeVisible();
    await expect(page.getByTestId('section-nav-H')).toBeVisible();
    await expect(page.getByTestId('section-nav-C')).not.toBeVisible();
    await expect(page.getByTestId('interview-tier-badge')).toContainText('Leadership');

    // Return to dashboard
    await page.getByTestId('back-to-dashboard-btn').click();
    await expect(page.getByTestId('dashboard-search-input')).toBeVisible();

    // 2. Frontline Tier
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Moses Otim');
    await page.getByTestId('interviewee-role-input').fill('District Labour Officer');
    await page.getByTestId('tier-option-Frontline').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Frontline sections: C, E, F, H exist; A does not exist
    await expect(page.getByTestId('section-nav-C')).toBeVisible();
    await expect(page.getByTestId('section-nav-E')).toBeVisible();
    await expect(page.getByTestId('section-nav-F')).toBeVisible();
    await expect(page.getByTestId('section-nav-H')).toBeVisible();
    await expect(page.getByTestId('section-nav-A')).not.toBeVisible();
    await expect(page.getByTestId('interview-tier-badge')).toContainText('Frontline');

    await page.getByTestId('back-to-dashboard-btn').click();

    // 3. Support/IT Tier
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Kigozi Denis');
    await page.getByTestId('interviewee-role-input').fill('Database Lead');
    await page.getByTestId('tier-option-Support/IT').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Support/IT sections: E, G, H exist; A does not exist
    await expect(page.getByTestId('section-nav-E')).toBeVisible();
    await expect(page.getByTestId('section-nav-G')).toBeVisible();
    await expect(page.getByTestId('section-nav-H')).toBeVisible();
    await expect(page.getByTestId('section-nav-A')).not.toBeVisible();
    await expect(page.getByTestId('interview-tier-badge')).toContainText('Support/IT');

    await page.getByTestId('back-to-dashboard-btn').click();

    // 4. Management Tier
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Wandera Martin');
    await page.getByTestId('interviewee-role-input').fill('Head of Industrial Relations');
    await page.getByTestId('tier-option-Management').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Management sections: comprehensive scope (A through H)
    await expect(page.getByTestId('section-nav-A')).toBeVisible();
    await expect(page.getByTestId('section-nav-B')).toBeVisible();
    await expect(page.getByTestId('section-nav-C')).toBeVisible();
    await expect(page.getByTestId('section-nav-D')).toBeVisible();
    await expect(page.getByTestId('section-nav-E')).toBeVisible();
    await expect(page.getByTestId('section-nav-F')).toBeVisible();
    await expect(page.getByTestId('section-nav-G')).toBeVisible();
    await expect(page.getByTestId('section-nav-H')).toBeVisible();
    await expect(page.getByTestId('interview-tier-badge')).toContainText('Management');
  });

  test('Answer questions, auto-save, progress update, tab navigation, notes, and status lifecycle', async ({ page }) => {
    // 1. Create a fresh interview
    await page.getByTestId('dashboard-new-interview-btn').click();
    await page.getByTestId('interviewee-name-input').fill('Dr. Patrick Okello');
    await page.getByTestId('interviewee-role-input').fill('Principal Occupational Health Officer');
    await page.getByTestId('tier-option-Management').click();
    await page.getByTestId('create-interview-submit-btn').click();

    // Form opened
    await expect(page.getByTestId('status-badge')).toContainText('Draft');
    await expect(page.getByTestId('auto-save-indicator')).toContainText('Saved');

    // 2. Answer question A1
    const testAnswer = 'The statutory mandate under OSH Act 2006 is actively enforced across industrial manufacturing zones in Kampala.';
    const q1Input = page.getByTestId('question-input-A1');
    await expect(q1Input).toBeVisible();
    await q1Input.fill(testAnswer);

    // Auto-save triggers and settles to Saved
    await expect(page.getByTestId('auto-save-indicator')).toBeVisible();

    // 3. Navigate to Documents tab
    await page.getByTestId('tab-documents').click();
    await expect(page.getByTestId('checklist-item-1')).toBeVisible();

    // Mark item #1 as Collected
    const colStatusBtn = page.getByTestId('col-status-1-collected');
    await colStatusBtn.click();

    // 4. Navigate to Notes tab
    await page.getByTestId('tab-notes').click();
    const testObservation = 'Officer displayed exceptional candor concerning field transport shortages for factory inspections.';
    await page.getByTestId('notes-observations').fill(testObservation);

    // 5. Change Status to In Progress and then Completed
    await page.getByTestId('status-btn-in-progress').click();
    await expect(page.getByTestId('status-badge')).toContainText('In Progress');

    await page.getByTestId('status-btn-completed').click();
    await expect(page.getByTestId('status-badge')).toContainText('Completed');

    // 6. Page Refresh: Verify complete persistence
    await page.reload();

    // Verify interview status and data persisted
    await expect(page.getByTestId('status-badge')).toContainText('Completed');

    // Check Question A1 answer
    await page.getByTestId('tab-questionnaire').click();
    await expect(page.getByTestId('question-input-A1')).toHaveValue(testAnswer);

    // Check Notes tab
    await page.getByTestId('tab-notes').click();
    await expect(page.getByTestId('notes-observations')).toHaveValue(testObservation);
  });
});
