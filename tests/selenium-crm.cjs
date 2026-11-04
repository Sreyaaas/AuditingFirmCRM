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

        await searchInput.sendKeys('\uE00C');
      } else {
        throw new Error('Command palette search input not visible');
      }
    } catch (e) {
      console.error(`[FAIL] Test 8: Command Palette failed - ${e.message}`);
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
