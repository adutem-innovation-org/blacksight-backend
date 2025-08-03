import { config } from "@/config";
import { logJsonError, throwNotFoundError, throwServerError } from "@/helpers";
import { logger } from "@/logging";
import puppeteer, { Browser, Page } from "puppeteer";
import { Logger } from "winston";

export class ScrapeService {
  private static instance: ScrapeService;
  private static logger: Logger = logger;
  private static logJsonError = logJsonError;

  private browser: Browser | null = null;
  private initialized: boolean = false;

  constructor() {
    this._setupEventListener();
  }

  private _setupEventListener() {
    // Graceful shutdown
    process.on("SIGTERM", () => this.cleanup());
    process.on("SIGINT", () => this.cleanup());
  }

  static getInstance(): ScrapeService {
    if (!this.instance) {
      this.instance = new ScrapeService();
    }
    return this.instance;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          // "--no-zygote",
          // "--single-process",
        ],
        timeout: 30000,
      });
      this.initialized = true;
      ScrapeService.logger.info("Browser initialized successfully");
    } catch (error) {
      ScrapeService.logger.error("Failed to initialize browser", { error });
      throw new Error("Scrapper initilization failed");
    }
  }

  async scrapePage(url: string) {
    if (!this.browser) await this.initialize();

    let page: Page | null = null;

    try {
      page = await this.browser!.newPage();

      // Set user agent and viewport
      await page.setUserAgent(config.scraping.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });

      // Block unnecessary resources to speed up loading
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const resourceType = req.resourceType();
        if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: config.scraping.timeout,
      });

      const title = await page.title();

      // Extract content with better selectors (returning all valid matches)
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll("script, style");
        scripts.forEach((el) => el.remove());

        // Try multiple content selectors
        const selectors = [
          "article",
          '[role="main"]',
          "main",
          ".content",
          ".post-content",
          ".entry-content",
          "body",
        ];

        const seen = new Set();
        const collectedTexts: string[] = [];

        for (const selector of selectors) {
          const elements = document.querySelectorAll<HTMLElement>(selector);

          elements.forEach((element) => {
            const text = element.innerText.trim();
            if (text.length > 100 && !seen.has(text)) {
              collectedTexts.push(text);
              seen.add(text); // avoid duplicates
            }
          });
        }

        if (collectedTexts.length === 0) {
          return document.body.innerText.trim();
        }

        return collectedTexts.join("\n\n"); // separate sections clearly
      });

      if (!content || content.trim().length === 0) {
        return throwNotFoundError("No content found on the page");
      }

      if (content.length > config.scraping.maxContentLength) {
        ScrapeService.logger.warn("Content truncated due to size");
        return {
          content: content.substring(0, config.scraping.maxContentLength),
          title,
          url,
        };
      }

      ScrapeService.logger.info("Page scraped successfully", {
        url,
        contentLength: content.length,
      });

      return { content, title, url };
    } catch (error: any) {
      ScrapeService.logger.error("Scraping failed");
      ScrapeService.logJsonError({
        url,
        error: error.message,
      });
      throwServerError("Unable to parse website");
    } finally {
      if (page) {
        await page.close().catch((err) => {
          ScrapeService.logger.error("Failed to close page");
          ScrapeService.logJsonError({
            url,
            error: err.message,
          });
        });
      }
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close().catch((err) => {
        ScrapeService.logger.error("Failed to close browser", {
          error: err.message,
        });
      });
      this.browser = null;
      this.initialized = false;
      ScrapeService.logger.info("Browser cleanup closed");
    }
  }
}
