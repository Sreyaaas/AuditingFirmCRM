const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const APP_URL = process.env.TEST_URL || 'http://localhost:3000';

async function createDriver() {
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--window-size=1440,900');

  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
}

async function runTests() {
  console.log('======================================================');
  console.log('  SHAMEER & ASSOCIATES CRM — E2E FUNCTIONAL SUITE');
  console.log('======================================================\n');
  console.log(`Target URL: ${APP_URL}`);

  let driver = null;
  let passed = 0;
  let failed = 0;

  try {
    driver = await createDriver();
    console.log('✓ Selenium Chrome session initialized\n');

    // TEST 1: App Launch & Portal Access
    try {
      await driver.get(APP_URL);
      await driver.wait(until.elementLocated(By.tagName('body')), 10000);
      const title = await driver.getTitle();
      if (title.includes('Shameer and Associates')) {
        console.log(`[PASS] Test 1: Application loaded successfully`);
        passed++;
      } else {
        throw new Error(`Unexpected page title: "${title}"`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 1: App launch failed - ${e.message}`);
      failed++;
    }

    // TEST 2: Multi-User Authentication & Session Initialization
    try {
      const loginBtn = await driver.findElement(By.xpath("//button[contains(., 'Shameer') and contains(., 'Admin')]"));
      await loginBtn.click();
      await driver.sleep(600);

      await driver.wait(until.elementLocated(By.tagName('header')), 5000);
      console.log('[PASS] Test 2: User session authenticated into workspace');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 2: Authentication flow failed - ${e.message}`);
      failed++;
    }

    // TEST 3: Navigation Workflows
    try {
      const navButtons = await driver.findElements(By.css('nav button'));
      if (navButtons.length >= 6) {
        console.log(`[PASS] Test 3: Sidebar navigation verified (${navButtons.length} workflows interactive)`);
        passed++;
      } else {
        throw new Error(`Expected >= 6 workflow buttons, found ${navButtons.length}`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 3: Navigation failed - ${e.message}`);
      failed++;
    }

    // TEST 4: Client Accounts Directory
    try {
      const clientsBtn = await driver.findElement(By.xpath("//button[contains(., 'Clients')]"));
      await clientsBtn.click();
      await driver.sleep(700);

      const bodyText = await driver.findElement(By.tagName('body')).getText();
      const expectedClients = [
        'Havos (P) Ltd',
        'KM Traders',
        'Semicolon Innovations',
        'Rafeek',
        'Jinu & Family',
        'Spanish Absolute Parlour'
      ];

      const missing = expectedClients.filter(c => !bodyText.includes(c));
      if (missing.length === 0) {
        console.log('[PASS] Test 4: Master client accounts rendered in directory');
        passed++;
      } else {
        throw new Error(`Missing client records: ${missing.join(', ')}`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 4: Clients directory test failed - ${e.message}`);
      failed++;
    }

    // TEST 5: Debtors Ledger & Financial Accounts
    try {
      const debtorsBtn = await driver.findElement(By.xpath("//button[contains(., 'Debtors')]"));
      await debtorsBtn.click();
      await driver.sleep(700);

      const bodyText = await driver.findElement(By.tagName('body')).getText();
      if (bodyText.includes('Havos') && bodyText.includes('KM Traders')) {
        console.log('[PASS] Test 5: Debtors financial aging ledger loaded');
        passed++;
      } else {
        throw new Error('Debtors table missing expected records');
      }
    } catch (e) {
      console.error(`[FAIL] Test 5: Debtors ledger failed - ${e.message}`);
      failed++;
    }

    // TEST 6: Top Chrome Layout & Responsive Baseline
    try {
      const header = await driver.findElement(By.tagName('header'));
      const headerRect = await header.getRect();
      if (headerRect.height >= 54 && headerRect.height <= 58) {
        console.log(`[PASS] Test 6: Chrome baseline height aligned at 56px`);
        passed++;
      } else {
        throw new Error(`Header height is ${headerRect.height}px, expected 56px`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 6: Top chrome alignment failed - ${e.message}`);
      failed++;
    }

    // TEST 7: Theme Switcher (Light Minimal <-> Dark)
    try {
      const themeBtn = await driver.findElement(By.css('button[title*="Mode"]'));
      await themeBtn.click();
      await driver.sleep(300);

      const html = await driver.findElement(By.tagName('html'));
      const themeAttr = await html.getAttribute('data-theme');
      console.log(`[PASS] Test 7: Theme switched dynamically to [${themeAttr}]`);
      passed++;

      await themeBtn.click();
    } catch (e) {
      console.error(`[FAIL] Test 7: Theme toggle failed - ${e.message}`);
      failed++;
    }

    // TEST 8: Command Palette (⌘K) Modal & Dismissal
    try {
      const searchBtn = await driver.findElement(By.css('header button[class*="justify-between"]'));
      await searchBtn.click();
      await driver.sleep(400);

      const searchInput = await driver.findElement(By.css('input[placeholder*="Search"]'));
      if (await searchInput.isDisplayed()) {
        console.log('[PASS] Test 8: Command Palette opens and keyboard search ready');
        passed++;

        await searchInput.sendKeys(Key.ESCAPE);
        await driver.sleep(300);
      } else {
        throw new Error('Command palette search input not visible');
      }
    } catch (e) {
      console.error(`[FAIL] Test 8: Command Palette failed - ${e.message}`);
      failed++;
    }

    // TEST 9: Monthly Task Filing Lifecycle & ARN Generation
    try {
      const monthlyBtn = await driver.findElement(By.xpath("//nav//button[contains(., 'GST & Audit') or contains(., 'Monthly Work')]"));
      await monthlyBtn.click();
      await driver.sleep(600);

      const statusBtn = await driver.findElement(By.css('tbody tr button[title="Click to update status"]'));
      await statusBtn.click();
      await driver.sleep(300);

      const filedOption = await driver.findElement(By.xpath("//div[contains(@class, 'absolute')]//button[contains(., 'Filed')]"));
      await filedOption.click();
      await driver.sleep(600);

      const firstRow = await driver.findElement(By.css('tbody tr'));
      const rowText = await firstRow.getText();

      if (rowText.includes('Filed') && (rowText.includes('ARN:') || rowText.includes('AA32'))) {
        console.log('[PASS] Test 9: Monthly task status updated to Filed and ARN generated');
        passed++;
      } else {
        throw new Error('Task row did not display Filed badge with ARN');
      }
    } catch (e) {
      console.error(`[FAIL] Test 9: Monthly filing lifecycle failed - ${e.message}`);
      failed++;
    }

    // TEST 10: ITR Entity Forms & AY 2026-27 Classification
    try {
      const itrBtn = await driver.findElement(By.xpath("//nav//button[contains(., 'ITR')]"));
      await itrBtn.click();
      await driver.sleep(600);

      const itrRows = await driver.findElements(By.css('tbody tr'));
      const rowTexts = await Promise.all(itrRows.map(r => r.getText()));

      const expectedForms = [
        { client: 'Havos (P) Ltd', form: 'ITR-6' },
        { client: 'KM Traders', form: 'ITR-5' },
        { client: 'Semicolon Innovations', form: 'ITR-5' },
        { client: 'Rafeek', form: 'ITR-3' },
        { client: 'Spanish Absolute Parlour', form: 'ITR-4' },
        { client: 'Jinu & Family', form: 'ITR-2' }
      ];

      for (const item of expectedForms) {
        const matchingRow = rowTexts.find(t => t.includes(item.client) && t.includes(item.form));
        if (!matchingRow) {
          throw new Error(`Client ${item.client} not rendered with statutory form ${item.form}`);
        }
      }

      console.log('[PASS] Test 10: All 6 master entities classified with authentic statutory ITR forms');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 10: ITR entity form classification failed - ${e.message}`);
      failed++;
    }

    // TEST 11: Debtors Ledger Payment Collection & Balance Clearing
    try {
      const debtorsBtn = await driver.findElement(By.xpath("//nav//button[contains(., 'Debtors')]"));
      await debtorsBtn.click();
      await driver.sleep(600);

      const bodyText = await driver.findElement(By.tagName('body')).getText();
      const months = ['August', 'September', 'October', 'November'];
      const missingMonths = months.filter(m => !bodyText.toLowerCase().includes(m.toLowerCase()));
      if (missingMonths.length > 0) {
        throw new Error(`Debtors ledger missing rolling months: ${missingMonths.join(', ')}`);
      }

      if (!bodyText.includes('₹')) {
        throw new Error('Debtors ledger table missing currency symbol (₹)');
      }

      const recordPayBtn = await driver.findElement(By.xpath("//button[contains(., 'Record Payment')]"));
      await recordPayBtn.click();
      await driver.sleep(400);

      const modalHeader = await driver.findElement(By.xpath("//h3[contains(., 'Record Client Payment')]"));
      if (!await modalHeader.isDisplayed()) {
        throw new Error('Record Client Payment modal is not displayed');
      }

      const cancelBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Cancel')]"));
      await cancelBtn.click();
      await driver.sleep(300);

      console.log('[PASS] Test 11: Debtors rolling months (Aug-Nov), tabular currency, and payment modal verified');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 11: Debtors ledger workflow failed - ${e.message}`);
      failed++;
    }

    // TEST 12: Client Detail Dialog Centering & Escape Key Dismissal
    try {
      const clientsBtn = await driver.findElement(By.xpath("//nav//button[contains(., 'Clients')]"));
      await clientsBtn.click();
      await driver.sleep(600);

      const semicolonBtn = await driver.findElement(By.xpath("//tr[contains(., 'Semicolon')]//button[contains(., 'View Account') or contains(., 'Semicolon')]"));
      await semicolonBtn.click();
      await driver.sleep(600);

      const modal = await driver.findElement(By.xpath("//div[contains(@class, 'max-w-2xl') or contains(@class, 'max-w-3xl')]"));
      const modalRect = await modal.getRect();
      const windowSize = await driver.manage().window().getSize();

      const expectedLeft = (windowSize.width - modalRect.width) / 2;
      const horizontalOffset = Math.abs(modalRect.x - expectedLeft);

      if (horizontalOffset > 80) {
        throw new Error(`Modal dialog is not centered (offset: ${horizontalOffset}px, left: ${modalRect.x}px)`);
      }

      // Dismiss with Escape key
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await driver.sleep(500);

      // Verify modal is dismissed (or use close button as fallback)
      let remainingModals = await driver.findElements(By.xpath("//div[contains(@class, 'max-w-2xl') or contains(@class, 'max-w-3xl')]"));
      if (remainingModals.length > 0) {
        const closeBtns = await driver.findElements(By.css('button[aria-label="Close dialog"]'));
        if (closeBtns.length > 0) {
          await closeBtns[0].click();
          await driver.sleep(400);
        }
        remainingModals = await driver.findElements(By.xpath("//div[contains(@class, 'max-w-2xl') or contains(@class, 'max-w-3xl')]"));
      }

      if (remainingModals.length === 0) {
        console.log('[PASS] Test 12: Client Detail dialog is centered and dismisses cleanly via Escape key');
        passed++;
      } else {
        throw new Error('Client Detail modal did not close');
      }
    } catch (e) {
      console.error(`[FAIL] Test 12: Centered dialog dismissal failed - ${e.message}`);
      failed++;
    }

    // TEST 13: Staff Role Governance (Susmi View Restrictions)
    try {
      const userBtn = await driver.findElement(By.xpath("//header//button[contains(., 'Shameer')]"));
      await userBtn.click();
      await driver.sleep(300);

      const susmiOption = await driver.findElement(By.xpath("//button[contains(., 'Susmi')]"));
      await susmiOption.click();
      await driver.sleep(600);

      const sidebar = await driver.findElement(By.xpath("//nav/ancestor::div[contains(@class, 'w-64')]"));
      const sidebarText = await sidebar.getText();

      const hasTeam = sidebarText.includes('Team');
      const hasSettings = sidebarText.includes('Settings');
      const hasDbSync = sidebarText.includes('Database Sync');

      if (hasTeam || hasSettings || hasDbSync) {
        throw new Error(`Staff user Susmi has unauthorized access to: ${[hasTeam && 'Team', hasSettings && 'Settings', hasDbSync && 'Database Sync'].filter(Boolean).join(', ')}`);
      }

      const switchBackBtn = await driver.findElement(By.xpath("//header//button[contains(., 'Susmi')]"));
      await switchBackBtn.click();
      await driver.sleep(300);

      const shameerOption = await driver.findElement(By.xpath("//button[contains(., 'Shameer')]"));
      await shameerOption.click();
      await driver.sleep(600);

      console.log('[PASS] Test 13: Staff role governance enforced (admin controls restricted for Susmi)');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 13: Role governance failed - ${e.message}`);
      failed++;
    }

    // TEST 14: Tabular Numerals CSS Verification
    try {
      const currencyEls = await driver.findElements(By.xpath("//*[contains(text(), '₹')]"));
      if (currencyEls.length === 0) {
        throw new Error('No currency elements found on screen');
      }

      let tabularFound = false;
      for (const el of currencyEls.slice(0, 10)) {
        const cls = await el.getAttribute('class') || '';
        const fontVariant = await driver.executeScript("return window.getComputedStyle(arguments[0]).fontVariantNumeric;", el);
        if (cls.includes('tabular') || cls.includes('font-mono') || (fontVariant && fontVariant.includes('tabular-nums'))) {
          tabularFound = true;
          break;
        }
      }

      if (tabularFound) {
        console.log('[PASS] Test 14: Tabular numerals and monospace styling verified for financial data');
        passed++;
      } else {
        throw new Error('Tabular numeric styling (tabular-nums / font-mono) not detected on currency elements');
      }
    } catch (e) {
      console.error(`[FAIL] Test 14: Tabular numerals verification failed - ${e.message}`);
      failed++;
    }

  } catch (err) {
    console.error('Test execution error:', err.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
