import { Browser, Page, chromium } from 'playwright';
import { promises as fs } from 'fs';
import { ArticleToPublish, VintedPublishResult, VintedSession } from '../types/vinted.js';
import path from 'path';
import os from 'os';

export class VintedAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private sessionPath: string;

  constructor(sessionPath: string = './vinted-session.json') {
    this.sessionPath = sessionPath;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100,
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'fr-FR',
    });

    await this.loadSession(context);

    this.page = await context.newPage();
  }

  private async loadSession(context: any): Promise<void> {
    try {
      const sessionData = await fs.readFile(this.sessionPath, 'utf-8');
      const session: VintedSession = JSON.parse(sessionData);

      if (session.cookies && session.cookies.length > 0) {
        await context.addCookies(session.cookies);
        console.log('✓ Session loaded successfully');
      }
    } catch (error) {
      console.warn('⚠ No session file found. You will need to authenticate manually.');
    }
  }

  async saveSession(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = this.browser.contexts()[0];
    const cookies = await context.cookies();

    const session: VintedSession = {
      cookies: cookies,
    };

    await fs.writeFile(this.sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    console.log('✓ Session saved successfully');
  }

  async navigateToNewItemPage(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.goto('https://www.vinted.fr/items/new', {
      waitUntil: 'networkidle',
    });

    await this.page.waitForTimeout(2000);
  }

  async checkAuthentication(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.goto('https://www.vinted.fr', { waitUntil: 'networkidle' });

    const isLoggedIn = await this.page.evaluate(() => {
      const userMenu = document.querySelector('[data-testid="user-menu"]');
      return userMenu !== null;
    });

    return isLoggedIn;
  }

  private async downloadPhoto(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = path.basename(new URL(url).pathname);
    const tempPath = path.join(os.tmpdir(), filename);

    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  async uploadPhotos(photoPaths: string[]): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const fileInput = await this.page.locator('input[type="file"][accept*="image"]').first();

    const localPaths: string[] = [];

    for (const photoPath of photoPaths) {
      let localPath = photoPath;

      if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        console.log(`📥 Downloading photo from: ${photoPath}`);
        localPath = await this.downloadPhoto(photoPath);
        localPaths.push(localPath);
      }

      await fileInput.setInputFiles(localPath);
      await this.page.waitForTimeout(1500);
    }

    for (const localPath of localPaths) {
      try {
        await fs.unlink(localPath);
      } catch (error) {
        console.warn(`⚠ Failed to delete temp file: ${localPath}`);
      }
    }

    console.log(`✓ Uploaded ${photoPaths.length} photos`);
  }

  async fillArticleForm(article: ArticleToPublish): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.fill('input[name="title"]', article.title);
    await this.page.waitForTimeout(500);

    await this.page.fill('textarea[name="description"]', article.description);
    await this.page.waitForTimeout(500);

    await this.page.fill('input[name="brand"]', article.brand);
    await this.page.waitForTimeout(500);

    await this.page.fill('input[name="size"]', article.size);
    await this.page.waitForTimeout(500);

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

    const priceString = article.price.toFixed(2);
    await this.page.fill('input[name="price"]', priceString);
    await this.page.waitForTimeout(500);

    console.log('✓ Form filled successfully');
  }

  async submitArticle(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const submitButton = this.page.locator('button[type="submit"]').last();
    await submitButton.click();

    await this.page.waitForURL('**/items/*', {
      timeout: 30000,
      waitUntil: 'networkidle',
    });

    const vintedUrl = this.page.url();
    console.log(`✓ Article published: ${vintedUrl}`);

    return vintedUrl;
  }

  async publishArticle(article: ArticleToPublish): Promise<VintedPublishResult> {
    try {
      console.log(`\n📦 Publishing: ${article.title}`);

      await this.navigateToNewItemPage();

      if (article.photos && article.photos.length > 0) {
        await this.uploadPhotos(article.photos);
      }

      await this.fillArticleForm(article);

      const vintedUrl = await this.submitArticle();

      await this.page?.waitForTimeout(2000);

      return {
        success: true,
        articleId: article.id,
        vintedUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`✗ Failed to publish article: ${errorMessage}`);

      return {
        success: false,
        articleId: article.id,
        error: errorMessage,
      };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
