import puppeteer, { Browser, Page, HTTPRequest } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as path from 'path';
import * as os from 'os';

interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  wait?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  extraWait?: number;
  light?: boolean;
}

let browser: Browser | null = null;

function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
}

function getChromeExecutablePath(): string {
  // Check for custom path
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  // Auto-detect by platform
  const platform = os.platform();
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    return '/usr/bin/google-chrome';
  }
}

async function getBrowser(): Promise<Browser> {
  if (isServerless()) {
    // Create new browser for each request in serverless
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
  } else {
    // Reuse browser instance in local development
    if (!browser || !browser.isConnected()) {
      const executablePath = getChromeExecutablePath();
      browser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });
    }
    return browser;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const {
    width = 1200,
    height = 630,
    fullPage = false,
    wait = 'load',
    extraWait = 0,
    light = false
  } = options;

  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Set viewport
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1
    });

    // Resource blocking for light mode
    if (light) {
      await page.setRequestInterception(true);
      page.on('request', (request: HTTPRequest) => {
        const resourceType = request.resourceType();
        if (
          resourceType === 'image' ||
          resourceType === 'stylesheet' ||
          resourceType === 'font'
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }

    // Navigate with wait strategy
    const navigationOptions: any = {
      waitUntil: wait,
      timeout: 30000
    };

    await page.goto(url, navigationOptions);

    // Extra wait if specified
    if (extraWait > 0) {
      await page.waitForTimeout(extraWait);
    }

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage
    });

    return screenshot as Buffer;
  } finally {
    await page.close();
    // Close browser in serverless environments
    if (isServerless()) {
      await browserInstance.close();
    }
  }
}

