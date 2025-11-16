import { Browser, Page, chromium } from 'playwright';
import { Article, VintedCredentials, PublicationResult } from './types.js';
import { promises as fs } from 'fs';
import path from 'path';

const SESSION_FILE = './playwright-state/vinted-session.json';

export class VintedClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private credentials: VintedCredentials;
  private headless: boolean;

  constructor(credentials: VintedCredentials, headless = true) {
    this.credentials = credentials;
    this.headless = headless;
  }

  async initialize(): Promise<void> {
    console.log('🌐 Launching Chromium browser...');

    this.browser = await chromium.launch({
      headless: this.headless,
      slowMo: 100,
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'fr-FR',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await this.loadSession(context);

    this.page = await context.newPage();
    console.log('✓ Browser initialized');
  }

  private async loadSession(context: any): Promise<void> {
    try {
      await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
      const sessionData = await fs.readFile(SESSION_FILE, 'utf-8');
      const session = JSON.parse(sessionData);

      if (session.cookies && session.cookies.length > 0) {
        await context.addCookies(session.cookies);
        console.log('✓ Session loaded from cache');
      }
    } catch (error) {
      console.log('⚠ No cached session found, will need to authenticate');
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.browser) return;

    try {
      const context = this.browser.contexts()[0];
      const cookies = await context.cookies();

      await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
      await fs.writeFile(
        SESSION_FILE,
        JSON.stringify({ cookies }, null, 2),
        'utf-8'
      );
      console.log('✓ Session saved');
    } catch (error) {
      console.error('⚠ Failed to save session:', error);
    }
  }

  async checkAuthentication(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔐 Checking authentication status...');

    try {
      await this.page.goto('https://www.vinted.fr', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('[data-testid="user-menu"]') !== null;
      });

      if (isLoggedIn) {
        console.log('✓ Already authenticated');
        return true;
      }

      console.log('⚠ Not authenticated, logging in...');
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`🔑 Logging in as ${this.credentials.email}...`);

    await this.page.goto('https://www.vinted.fr/member/login', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await this.page.waitForSelector('input[name="login"]', { timeout: 10000 });

    await this.page.fill('input[name="login"]', this.credentials.email);
    await this.page.fill('input[name="password"]', this.credentials.password);

    await this.page.click('button[type="submit"]');

    await this.page.waitForNavigation({
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const isLoggedIn = await this.page.evaluate(() => {
      return document.querySelector('[data-testid="user-menu"]') !== null;
    });

    if (!isLoggedIn) {
      throw new Error('Login failed - please check credentials');
    }

    console.log('✓ Successfully logged in');
    await this.saveSession();
  }

  async publishArticle(article: Article): Promise<PublicationResult> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      console.log(`\n📦 Publishing article: ${article.title}`);

      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        await this.login();
      }

      console.log('📝 Navigating to new item page...');
      await this.page.goto('https://www.vinted.fr/items/new', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await this.page.waitForTimeout(2000);

      if (article.photos && article.photos.length > 0) {
        await this.uploadPhotos(article.photos);
      }

      await this.fillArticleForm(article);

      const vintedUrl = await this.submitArticle();

      console.log(`✅ Article published successfully: ${vintedUrl}`);

      return {
        success: true,
        vintedUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to publish article: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async uploadPhotos(photoPaths: string[]): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`📷 Uploading ${photoPaths.length} photos...`);

    try {
      const fileInput = await this.page.locator('input[type="file"][accept*="image"]').first();

      for (const photoPath of photoPaths) {
        await fileInput.setInputFiles(photoPath);
        await this.page.waitForTimeout(1500);
      }

      console.log(`✓ Uploaded ${photoPaths.length} photos`);
    } catch (error) {
      console.error('⚠ Photo upload failed:', error);
      throw new Error(`Photo upload failed: ${error}`);
    }
  }

  private async fillArticleForm(article: Article): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('✍️  Filling article form...');

    try {
      await this.page.fill('input[name="title"]', article.title);
      await this.page.waitForTimeout(500);

      if (article.description) {
        await this.page.fill('textarea[name="description"]', article.description);
        await this.page.waitForTimeout(500);
      }

      if (article.brand) {
        await this.page.fill('input[name="brand"]', article.brand);
        await this.page.waitForTimeout(500);
      }

      if (article.size) {
        await this.page.fill('input[name="size"]', article.size);
        await this.page.waitForTimeout(500);
      }

      await this.page.selectOption('select[name="status"]', article.condition);
      await this.page.waitForTimeout(500);

      if (article.color) {
        await this.page.fill('input[name="color"]', article.color);
        await this.page.waitForTimeout(500);
      }

      if (article.material) {
        await this.page.fill('input[name="material"]', article.material);
        await this.page.waitForTimeout(500);
      }

      const priceValue = parseFloat(article.price).toFixed(2);
      await this.page.fill('input[name="price"]', priceValue);
      await this.page.waitForTimeout(500);

      console.log('✓ Form filled successfully');
    } catch (error) {
      console.error('⚠ Form filling failed:', error);
      throw new Error(`Form filling failed: ${error}`);
    }
  }

  private async submitArticle(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🚀 Submitting article...');

    try {
      const submitButton = this.page.locator('button[type="submit"]').last();
      await submitButton.click();

      await this.page.waitForURL('**/items/*', {
        timeout: 30000,
        waitUntil: 'networkidle',
      });

      const vintedUrl = this.page.url();
      console.log(`✓ Article submitted: ${vintedUrl}`);

      await this.page.waitForTimeout(2000);

      return vintedUrl;
    } catch (error) {
      console.error('⚠ Submission failed:', error);
      throw new Error(`Article submission failed: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('✓ Browser closed');
    }
  }
}
