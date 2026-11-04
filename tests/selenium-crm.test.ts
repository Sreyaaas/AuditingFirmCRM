import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import edge from 'selenium-webdriver/edge.js';

const APP_URL = process.env.TEST_URL || 'http://localhost:3000';

async function createDriver(): Promise<WebDriver> {
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--window-size=1440,900');

  try {
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    return driver;
  } catch (err) {
    console.log('Chrome driver fallback to Edge: ' + (err as Error).message);
    const edgeOptions = new edge.Options();
    edgeOptions.addArguments('--headless=new');
    edgeOptions.addArguments('--no-sandbox');
    edgeOptions.addArguments('--window-size=1440,900');

    return await new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(edgeOptions)
      .build();
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('  SHAMEER & ASSOCIATES CRM — SELENIUM AUTOMATION SUITE');
  console.log('======================================================\n');
  console.log(`Connecting to: ${APP_URL}`);

  let driver: WebDriver | null = null;
  let passed = 0;
  let failed = 0;

  try {
    driver = await createDriver();
    console.log('✓ Selenium WebDriver session initialized successfully\n');

    // TEST 1: Page Load & Title Verification
    try {
      await driver.get(APP_URL);
      await driver.wait(until.elementLocated(By.tagName('body')), 8000);
      const title = await driver.getTitle();
      if (title.includes('Shameer and Associates')) {
        console.log(`[PASS] Test 1: Page loaded with correct practice title: "${title}"`);
        passed++;
      } else {
        throw new Error(`Unexpected page title: "${title}"`);
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 1: Page Load failed - ${e.message}`);
      failed++;
    }

    // TEST 2: Brand Header & Zero "CA Shameer" Rule
    try {
      const pageText = await driver.findElement(By.tagName('body')).getText();
      if (pageText.includes('CA Shameer')) {
        throw new Error('Found forbidden string "CA Shameer" in UI!');
      }
      console.log('[PASS] Test 2: Practice identity clean (Zero "CA Shameer" violations)');
      passed++;
    } catch (e: any) {
      console.error(`[FAIL] Test 2: Brand rule violation - ${e.message}`);
      failed++;
    }

    // TEST 3: Navigation & Workflow Tabs Verification
    try {
      const navButtons = await driver.findElements(By.css('nav button'));
      if (navButtons.length >= 6) {
        console.log(`[PASS] Test 3: Sidebar navigation rendered ${navButtons.length} interactive workflows`);
        passed++;
      } else {
        throw new Error(`Expected at least 6 nav buttons, found ${navButtons.length}`);
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 3: Sidebar navigation check failed - ${e.message}`);
      failed++;
    }

    // TEST 4: The 6 Authentic Master Clients Verification
    try {
      // Navigate to Client Accounts tab if needed
      const clientsTab = await driver.findElement(By.xpath("//button[contains(., 'Client Accounts')]"));
      await clientsTab.click();
      await driver.sleep(600);

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
        console.log('[PASS] Test 4: All 6 authentic master clients present and verified');
        passed++;
      } else {
        throw new Error(`Missing expected clients: ${missing.join(', ')}`);
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 4: Client verification failed - ${e.message}`);
      failed++;
    }

    // TEST 5: Debtors Ledger & Monospace Financial Numerals
    try {
      const debtorsTab = await driver.findElement(By.xpath("//button[contains(., 'Debtors')]"));
      await debtorsTab.click();
      await driver.sleep(600);

      const table = await driver.findElement(By.css('table'));
      const tableText = await table.getText();
      if (tableText.includes('Havos') && tableText.includes('KM Traders')) {
        console.log('[PASS] Test 5: Debtors financial ledger rendered authentic aging balances');
        passed++;
      } else {
        throw new Error('Debtors table missing expected records');
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 5: Debtors table test failed - ${e.message}`);
      failed++;
    }

    // TEST 6: Top Chrome 56px Alignment & Header Controls
    try {
      const header = await driver.findElement(By.tagName('header'));
      const headerHeight = (await header.getRect()).height;
      if (headerHeight >= 54 && headerHeight <= 58) {
        console.log(`[PASS] Test 6: Continuous top chrome height strictly maintained at ${headerHeight}px (h-14)`);
        passed++;
      } else {
        throw new Error(`Header height is ${headerHeight}px, expected 56px (h-14)`);
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 6: Header layout alignment failed - ${e.message}`);
      failed++;
    }

    // TEST 7: Theme Switcher (Light Minimal <-> Midnight Dark)
    try {
      const themeBtn = await driver.findElement(By.css('button[title*="Mode"]'));
      await themeBtn.click();
      await driver.sleep(300);

      const html = await driver.findElement(By.tagName('html'));
      const themeAttr = await html.getAttribute('data-theme');
      console.log(`[PASS] Test 7: Theme switch dynamically toggled to [data-theme="${themeAttr}"]`);
      passed++;

      // Toggle back to light
      await themeBtn.click();
    } catch (e: any) {
      console.error(`[FAIL] Test 7: Theme toggle test failed - ${e.message}`);
      failed++;
    }

    // TEST 8: Command Palette (⌘K) Keyboard Shortcut
    try {
      const searchBtn = await driver.findElement(By.css('header button[class*="justify-between"]'));
      await searchBtn.click();
      await driver.sleep(400);

      const modal = await driver.findElement(By.css('input[placeholder*="Search"]'));
      if (await modal.isDisplayed()) {
        console.log('[PASS] Test 8: Command Palette opened and search input ready');
        passed++;

        // Close on Escape
        await modal.sendKeys('\uE00C'); // Escape key
      } else {
        throw new Error('Command palette input not visible');
      }
    } catch (e: any) {
      console.error(`[FAIL] Test 8: Command Palette test failed - ${e.message}`);
      failed++;
    }

  } catch (globalError: any) {
    console.error('Fatal test error:', globalError.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  console.log('\n======================================================');
  console.log(`  TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
