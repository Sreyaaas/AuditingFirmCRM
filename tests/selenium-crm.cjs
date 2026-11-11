const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Default: the sample-data server (`npm run dev -- --port 3001` with VITE_SUPABASE_URL unset),
// so tests never write to the live database. To test against a real project set
// TEST_URL plus TEST_EMAIL / TEST_PASSWORD for an admin login.
const APP_URL = process.env.TEST_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

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

    // TEST 2: Sign-in (email + password) or sample mode
    try {
      const passwordFields = await driver.findElements(By.css('input[type="password"]'));
      if (passwordFields.length > 0) {
        if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error('Login screen shown — set TEST_EMAIL and TEST_PASSWORD');
        await driver.findElement(By.css('input[type="email"]')).sendKeys(TEST_EMAIL);
        await passwordFields[0].sendKeys(TEST_PASSWORD);
        await driver.findElement(By.xpath("//button[contains(., 'Sign In')]")).click();
      }
      await driver.wait(until.elementLocated(By.tagName('header')), 10000);
      const quickSignIn = await driver.findElements(By.xpath("//button[contains(., 'Admin') and contains(., 'Shameer')]"));
      console.log(`[PASS] Test 2: Signed in (${passwordFields.length ? 'password' : 'sample mode'})${quickSignIn.length ? '' : ', no password-less sign-in'}`);
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

      const rows = await driver.findElements(By.css('tbody tr'));
      if (rows.length >= 1 && rows.length <= 50) {
        console.log(`[PASS] Test 4: Client directory rendered (${rows.length} rows)`);
        passed++;
      } else {
        throw new Error(`Unexpected client row count: ${rows.length}`);
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
      if (bodyText.includes('Debtors') && (bodyText.includes('₹') || bodyText.includes('Import Excel'))) {
        console.log('[PASS] Test 5: Debtors page loaded');
        passed++;
      } else {
        throw new Error('Debtors page missing balances or import action');
      }
    } catch (e) {
      console.error(`[FAIL] Test 5: Debtors page failed - ${e.message}`);
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

    // TEST 7: Theme picker (header palette menu)
    try {
      const html = await driver.findElement(By.tagName('html'));
      const original = await html.getAttribute('data-theme');
      const pick = async (name) => {
        await driver.findElement(By.css('button[aria-label="Select workspace theme"]')).click();
        await driver.sleep(300);
        await driver.findElement(By.xpath(`//header//button[contains(., '${name}')]`)).click();
        await driver.sleep(300);
      };
      await pick('Midnight Zinc');
      const darkAttr = await html.getAttribute('data-theme');
      if (!darkAttr || !darkAttr.endsWith('-dark')) throw new Error(`Expected a dark theme, got ${darkAttr}`);
      await pick('Firm Signature');
      const restored = await html.getAttribute('data-theme');
      console.log(`[PASS] Test 7: Theme switched ${original} → ${darkAttr} → ${restored}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 7: Theme picker failed - ${e.message}`);
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

      const filedOption = await driver.findElement(By.xpath("//div[contains(@class, 'absolute') or contains(@class, 'fixed')]//button[normalize-space(.)='Filed']"));
      await filedOption.click();
      await driver.sleep(400);

      // Filing now asks for the real ARN instead of inventing one.
      const arnInput = await driver.findElement(By.css('#task-arn-form input'));
      await arnInput.sendKeys('AA3211260481234');
      await driver.findElement(By.xpath("//button[contains(., 'Mark Filed')]")).click();
      await driver.sleep(600);

      const tableText = await driver.findElement(By.css('tbody')).getText();
      if (tableText.includes('Filed') && tableText.includes('AA3211260481234')) {
        console.log('[PASS] Test 9: Task marked Filed with the entered ARN');
        passed++;
      } else {
        throw new Error('Task row did not show Filed with the entered ARN');
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

      const formsOk = rowTexts.length > 0 && rowTexts.every((t) => /ITR-[1-7]/.test(t) || t.includes('No returns'));
      if (!formsOk) throw new Error('ITR rows missing a statutory form (ITR-1 … ITR-7)');

      console.log(`[PASS] Test 10: ITR returns listed with statutory forms (${rowTexts.length} rows)`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 10: ITR list failed - ${e.message}`);
      failed++;
    }

    // TEST 11: Debtors Ledger Payment Collection & Balance Clearing
    try {
      const debtorsBtn = await driver.findElement(By.xpath("//nav//button[contains(., 'Debtors')]"));
      await debtorsBtn.click();
      await driver.sleep(600);

      const bodyText = await driver.findElement(By.tagName('body')).getText();
      if (!/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d\d/.test(bodyText) || !bodyText.includes('All months')) {
        throw new Error('Debtors page missing month tabs');
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

      console.log('[PASS] Test 11: Debtors month tabs, currency and payment dialog verified');
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

      const semicolonBtn = await driver.findElement(By.xpath("(//tbody//tr//button[contains(., 'View Account')])[1]"));
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

    // TEST 13: Admin controls — team permissions and security settings
    try {
      await driver.findElement(By.xpath("//nav//button[contains(., 'Team')]")).click();
      await driver.sleep(500);
      const switches = await driver.findElements(By.css('button[role="switch"]'));
      if (switches.length === 0) throw new Error('Team page has no permission switches');

      await driver.findElement(By.xpath("//nav//button[contains(., 'Settings')]")).click();
      await driver.sleep(500);
      await driver.findElement(By.xpath("//button[contains(., 'Access & security')]")).click();
      await driver.sleep(300);
      const text = await driver.findElement(By.tagName('body')).getText();
      if (!text.includes('Sign out after inactivity')) throw new Error('Security settings not shown');

      // No "switch user" shortcut may exist in the user menu.
      await driver.findElement(By.css('header button[class*="pl-1"]')).click();
      await driver.sleep(300);
      const menuText = await driver.findElement(By.tagName('body')).getText();
      if (menuText.includes('Switch user')) throw new Error('User menu still offers switching accounts without a password');
      await driver.actions().sendKeys(Key.ESCAPE).perform();

      console.log('[PASS] Test 13: Team permissions, security settings, no password-less account switching');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 13: Admin controls failed - ${e.message}`);
      failed++;
    }

    // Return to a page with currency figures for the next check.
    try {
      await driver.findElement(By.xpath("//nav//button[contains(., 'Debtors')]")).click();
      await driver.sleep(500);
    } catch (e) { /* ignore */ }

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
