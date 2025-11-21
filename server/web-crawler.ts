import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  links: string[];
  forms: any[];
  depth: number;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  sameDomainOnly?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  relevantKeywords?: string[];
}

export class SmartWebCrawler {
  private visitedUrls: Set<string> = new Set();
  private crawledPages: CrawledPage[] = [];
  private baseDomain: string = '';
  private options: Required<CrawlOptions>;

  private defaultOptions: Required<CrawlOptions> = {
    maxDepth: 3,
    maxPages: 20,
    sameDomainOnly: false, // Changed to false to allow external crawling
    includePatterns: [
      'dashboard', 'admin', 'settings', 'profile', 'account',
      'home', 'index', 'main', 'login', 'register',
      'users', 'products', 'services', 'pages',
      'api', 'v1', 'v2', 'endpoints'
    ],
    excludePatterns: [
      'logout', 'signout', 'unsubscribe',
      'delete', 'remove', 'destroy',
      'cdn', 'static', 'assets', 'images',
      'css', 'js', 'jpg', 'png', 'gif', 'pdf', 'zip',
      'facebook.com', 'twitter.com', 'linkedin.com',
      'google.com', 'youtube.com', 'instagram.com'
    ],
    relevantKeywords: [
      'dashboard', 'admin', 'settings', 'profile', 'account',
      'user', 'login', 'register', 'home', 'main',
      'product', 'service', 'page', 'content'
    ]
  };

  constructor(options: CrawlOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async crawl(startUrl: string): Promise<CrawledPage[]> {
    console.log(`🕷️  Starting smart crawl from: ${startUrl}`);

    try {
      const url = new URL(startUrl);
      this.baseDomain = url.hostname;

      await this.crawlPage(startUrl, 0);

      console.log(`✅ Crawl completed! Found ${this.crawledPages.length} relevant pages`);
      return this.crawledPages;

    } catch (error) {
      console.error('❌ Crawl error:', error);
      return this.crawledPages;
    }
  }

  private async crawlPage(url: string, depth: number): Promise<void> {
    // Check limits
    if (depth > this.options.maxDepth) return;
    if (this.visitedUrls.has(url)) return;
    if (this.crawledPages.length >= this.options.maxPages) return;

    // Check if URL should be excluded
    if (!this.shouldCrawlUrl(url)) return;

    this.visitedUrls.add(url);
    console.log(`🕸️  Crawling: ${url} (depth: ${depth})`);

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SecureScan-Crawler/1.0 (Security Scanner)'
        }
      });

      const $ = cheerio.load(response.data);

      // Extract page info
      const title = $('title').text().trim() || 'No Title';
      const links = this.extractLinks($, url);
      const forms = this.extractForms($, url);

      const page: CrawledPage = {
        url,
        title,
        links,
        forms,
        depth
      };

      this.crawledPages.push(page);

      // Crawl discovered links (breadth-first)
      for (const link of links) {
        if (this.crawledPages.length < this.options.maxPages && !this.visitedUrls.has(link)) {
          await this.crawlPage(link, depth + 1);
        }
      }

    } catch (error: any) {
      console.error(`❌ Error crawling ${url}:`, error.message);
    }
  }

  private shouldCrawlUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Subdomain check: Allow if it's the same domain or a subdomain
      // e.g. if base is 'vulnweb.com', allow 'testphp.vulnweb.com'
      // if base is 'testphp.vulnweb.com', allow 'vulnweb.com' (maybe?) 
      // Let's stick to: allow if hostname ends with baseDomain (or baseDomain ends with hostname if we started at a subdomain)

      // Better approach:
      // If we started at 'testphp.vulnweb.com', baseDomain is 'testphp.vulnweb.com'.
      // We want to allow 'vulnweb.com' and 'api.vulnweb.com'? 
      // Usually we want to stay within the scope.
      // If user gives 'vulnweb.com', we want 'testphp.vulnweb.com'.
      // If user gives 'testphp.vulnweb.com', we probably only want that subdomain.

      // Let's relax it slightly: 
      // If sameDomainOnly is true (default), we only allow exact hostname match.
      // But we want to change default behavior to allow subdomains.

      // Let's define "root domain".
      const parts = this.baseDomain.split('.');
      const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : this.baseDomain;

      if (this.options.sameDomainOnly) {
        // Strict mode
        if (urlObj.hostname !== this.baseDomain) {
          return false;
        }
      } else {
        // "Smart" mode: Allow subdomains of the root domain
        if (!urlObj.hostname.endsWith(rootDomain)) {
          console.log(`Skipping external URL: ${url} (outside ${rootDomain})`);
          return false;
        }
      }

      // Exclude patterns
      for (const pattern of this.options.excludePatterns) {
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          console.log(`Skipping excluded URL: ${url} (contains ${pattern})`);
          return false;
        }
      }

      // Include patterns (if specified, URL must match at least one)
      if (this.options.includePatterns.length > 0) {
        const matchesInclude = this.options.includePatterns.some(pattern =>
          url.toLowerCase().includes(pattern.toLowerCase())
        );

        // Also check if URL path is relevant
        const path = urlObj.pathname.toLowerCase();
        const isRelevant = this.options.relevantKeywords.some(keyword =>
          path.includes(keyword.toLowerCase()) || path === '/' || path === ''
        );

        if (!matchesInclude && !isRelevant) {
          console.log(`Skipping non-relevant URL: ${url}`);
          return false;
        }
      }

      // Check file extensions
      const path = urlObj.pathname.toLowerCase();
      const excludedExtensions = ['.css', '.js', '.jpg', '.png', '.gif', '.pdf', '.zip', '.svg', '.ico'];
      if (excludedExtensions.some(ext => path.endsWith(ext))) {
        console.log(`Skipping static file: ${url}`);
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          if (this.shouldCrawlUrl(absoluteUrl) && !this.visitedUrls.has(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });

    return [...new Set(links)]; // Remove duplicates
  }

  private extractForms($: cheerio.CheerioAPI, baseUrl: string): any[] {
    const forms: any[] = [];

    $('form').each((_, element) => {
      const $form = $(element);
      const action = $form.attr('action') || '';
      const method = $form.attr('method') || 'GET';

      try {
        const actionUrl = action ? new URL(action, baseUrl).href : baseUrl;

        const inputs: any[] = [];
        $form.find('input, textarea, select').each((_, input) => {
          const $input = $(input);
          inputs.push({
            name: $input.attr('name'),
            type: $input.attr('type'),
            required: $input.attr('required') !== undefined,
            value: $input.attr('value') || ''
          });
        });

        forms.push({
          action: actionUrl,
          method: method.toUpperCase(),
          inputs: inputs.filter(input => input.name)
        });

      } catch (error: any) {
        console.error('Error parsing form:', error.message);
      }
    });

    return forms;
  }

  getCrawlStats(): object {
    return {
      totalPages: this.crawledPages.length,
      totalForms: this.crawledPages.reduce((sum, page) => sum + page.forms.length, 0),
      totalLinks: this.crawledPages.reduce((sum, page) => sum + page.links.length, 0),
      visitedUrls: this.visitedUrls.size,
      maxDepthReached: Math.max(...this.crawledPages.map(p => p.depth), 0)
    };
  }
  // Expose crawled pages for external use
  public getCrawledPages(): CrawledPage[] {
    return this.crawledPages;
  }
}

