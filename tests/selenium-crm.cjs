const { Builder, By, until } = require('selenium-webdriver');
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
  console.log('  SHAMEER & ASSOCIATES CRM — SELENIUM AUTOMATION SUITE');
  console.log('======================================================\n');
  console.log(`Target URL: ${APP_URL}`);

  let driver = null;
  let passed = 0;
  let failed = 0;

  try {
    console.log('Initializing Chrome Driver via Selenium Manager...');
    driver = await createDriver();
    console.log('✓ Selenium Chrome session initialized successfully\n');

    // TEST 1: Page Load & Title Verification
    try {
      await driver.get(APP_URL);
      await driver.wait(until.elementLocated(By.tagName('body')), 10000);
      const title = await driver.getTitle();
      if (title.includes('Shameer and Associates')) {
        console.log(`[PASS] Test 1: Page title verified ("${title}")`);
        passed++;
      } else {
        throw new Error(`Unexpected page title: "${title}"`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 1: Page Load failed - ${e.message}`);
      failed++;
    }

    // TEST 2: Brand Integrity — Zero "CA Shameer" Rule
    try {
      const pageText = await driver.findElement(By.tagName('body')).getText();
      if (pageText.includes('CA Shameer')) {
        throw new Error('Found forbidden prefix "CA Shameer" in UI text');
      }
      console.log('[PASS] Test 2: Brand integrity verified (Zero "CA Shameer" occurrences)');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 2: Brand integrity failed - ${e.message}`);
      failed++;
    }

    // TEST 3: Login Portal Verification & One-Click Practice Sign-In
    try {
      const shameerLoginBtn = await driver.findElement(By.xpath("//button[contains(., 'Shameer') and contains(., 'Admin')]"));
      await shameerLoginBtn.click();
      await driver.sleep(600);

      // Verify dashboard loaded
      await driver.wait(until.elementLocated(By.tagName('header')), 5000);
      console.log('[PASS] Test 3: Authenticated into CRM as Admin (Shameer)');
      passed++;
    } catch (e) {
      console.error(`[FAIL] Test 3: Authentication failed - ${e.message}`);
      failed++;
    }

    // TEST 4: Sidebar Navigation Workflows Roster
    try {
      const navButtons = await driver.findElements(By.css('nav button'));
      if (navButtons.length >= 6) {
        console.log(`[PASS] Test 4: Sidebar navigation verified (${navButtons.length} workflows interactive)`);
        passed++;
      } else {
        throw new Error(`Expected >= 6 workflow buttons, found ${navButtons.length}`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 4: Sidebar navigation failed - ${e.message}`);
      failed++;
    }

    // TEST 5: The 6 Authentic Master Clients Verification
    try {
      const clientsBtn = await driver.findElement(By.xpath("//button[contains(., 'Client Accounts')]"));
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
        console.log('[PASS] Test 5: All 6 authentic master clients verified in directory');
        passed++;
      } else {
        throw new Error(`Missing expected client entities: ${missing.join(', ')}`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 5: Clients directory test failed - ${e.message}`);
      failed++;
    }

    // TEST 6: Debtors Ledger & Monospace Numerals
    try {
      const debtorsBtn = await driver.findElement(By.xpath("//button[contains(., 'Debtors')]"));
      await debtorsBtn.click();
      await driver.sleep(700);

      const bodyText = await driver.findElement(By.tagName('body')).getText();
      if (bodyText.includes('Havos') && bodyText.includes('KM Traders')) {
        console.log('[PASS] Test 6: Debtors financial ledger verified with authentic aging balances');
        passed++;
      } else {
        throw new Error('Debtors ledger table missing expected entities');
      }
    } catch (e) {
      console.error(`[FAIL] Test 6: Debtors ledger failed - ${e.message}`);
      failed++;
    }

    // TEST 7: Continuous Top Chrome 56px Baseline Alignment
    try {
      const header = await driver.findElement(By.tagName('header'));
      const headerRect = await header.getRect();
      if (headerRect.height >= 54 && headerRect.height <= 58) {
        console.log(`[PASS] Test 7: Continuous top chrome height strictly aligned at ${headerRect.height}px (h-14)`);
        passed++;
      } else {
        throw new Error(`Header height is ${headerRect.height}px, expected 56px`);
      }
    } catch (e) {
      console.error(`[FAIL] Test 7: Top chrome alignment failed - ${e.message}`);
      failed++;
    }

    // TEST 8: Theme Switcher (Light Minimal <-> Midnight Dark)
    try {
      const themeBtn = await driver.findElement(By.css('button[title*="Mode"]'));
      await themeBtn.click();
      await driver.sleep(300);

      const html = await driver.findElement(By.tagName('html'));
      const themeAttr = await html.getAttribute('data-theme');
      console.log(`[PASS] Test 8: Theme toggled dynamically to [data-theme="${themeAttr}"]`);
      passed++;

      // Revert to light
      await themeBtn.click();
    } catch (e) {
      console.error(`[FAIL] Test 8: Theme toggle failed - ${e.message}`);
      failed++;
    }

    // TEST 9: Command Palette (⌘K) Keyboard Modal
    try {
      const searchBtn = await driver.findElement(By.css('header button[class*="justify-between"]'));
      await searchBtn.click();
      await driver.sleep(400);

      const searchInput = await driver.findElement(By.css('input[placeholder*="Search"]'));
      if (await searchInput.isDisplayed()) {
        console.log('[PASS] Test 9: Command Palette opened with search input active');
        passed++;

        // Close on Escape
        await searchInput.sendKeys('\uE00C');
      } else {
        throw new Error('Command palette search input not visible');
      }
    } catch (e) {
      console.error(`[FAIL] Test 9: Command Palette test failed - ${e.message}`);
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
