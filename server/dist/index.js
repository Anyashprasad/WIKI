// index.ts
import express from "express";
import cors from "cors";

// routes.ts
import { createServer } from "http";

// storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  constructor() {
    this.scans = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
  }
  async createScan(insertScan) {
    const id = randomUUID();
    const scan = {
      ...insertScan,
      id,
      status: "pending",
      vulnerabilities: [],
      pagesScanned: 0,
      crawlStats: {},
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null,
      formsFound: 0,
      endpointsTested: 0
    };
    this.scans.set(id, scan);
    return scan;
  }
  async getScan(id) {
    return this.scans.get(id);
  }
  async updateScan(id, updates) {
    const scan = this.scans.get(id);
    if (!scan) return void 0;
    const updatedScan = { ...scan, ...updates };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }
  async getScans() {
    return Array.from(this.scans.values());
  }
  async createChatMessage(insertMessage) {
    const id = randomUUID();
    const message = {
      ...insertMessage,
      id,
      response: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }
  async getChatMessage(id) {
    return this.chatMessages.get(id);
  }
  async updateChatMessage(id, updates) {
    const message = this.chatMessages.get(id);
    if (!message) return void 0;
    const updatedMessage = { ...message, ...updates };
    this.chatMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  async getChatMessages() {
    return Array.from(this.chatMessages.values());
  }
};
var storage = new MemStorage();

// ../shared/index.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"),
  vulnerabilities: jsonb("vulnerabilities").default(sql`'[]'::jsonb`),
  pagesScanned: integer("pages_scanned").default(0),
  formsFound: integer("forms_found").default(0),
  // <-- ADD THIS
  endpointsTested: integer("endpoints_tested").default(0),
  // <-- ADD THIS
  crawlStats: jsonb("crawl_stats").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertScanSchema = createInsertSchema(scans).pick({
  url: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  message: true
});

// routes.ts
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

// vulnerability-scanner.ts
import axios2 from "axios";
import * as cheerio2 from "cheerio";
import { JSDOM } from "jsdom";
import { URL as URL2 } from "url";

// web-crawler.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
var SmartWebCrawler = class {
  constructor(options = {}) {
    this.visitedUrls = /* @__PURE__ */ new Set();
    this.crawledPages = [];
    this.baseDomain = "";
    this.defaultOptions = {
      maxDepth: 3,
      maxPages: 20,
      sameDomainOnly: false,
      // Changed to false to allow external crawling
      includePatterns: [
        "dashboard",
        "admin",
        "settings",
        "profile",
        "account",
        "home",
        "index",
        "main",
        "login",
        "register",
        "users",
        "products",
        "services",
        "pages",
        "api",
        "v1",
        "v2",
        "endpoints"
      ],
      excludePatterns: [
        "logout",
        "signout",
        "unsubscribe",
        "delete",
        "remove",
        "destroy",
        "cdn",
        "static",
        "assets",
        "images",
        "css",
        "js",
        "jpg",
        "png",
        "gif",
        "pdf",
        "zip",
        "facebook.com",
        "twitter.com",
        "linkedin.com",
        "google.com",
        "youtube.com",
        "instagram.com"
      ],
      relevantKeywords: [
        "dashboard",
        "admin",
        "settings",
        "profile",
        "account",
        "user",
        "login",
        "register",
        "home",
        "main",
        "product",
        "service",
        "page",
        "content"
      ]
    };
    this.options = { ...this.defaultOptions, ...options };
  }
  async crawl(startUrl) {
    console.log(`\u{1F577}\uFE0F  Starting smart crawl from: ${startUrl}`);
    try {
      const url = new URL(startUrl);
      this.baseDomain = url.hostname;
      await this.crawlPage(startUrl, 0);
      console.log(`\u2705 Crawl completed! Found ${this.crawledPages.length} relevant pages`);
      return this.crawledPages;
    } catch (error) {
      console.error("\u274C Crawl error:", error);
      return this.crawledPages;
    }
  }
  async crawlPage(url, depth) {
    if (depth > this.options.maxDepth) return;
    if (this.visitedUrls.has(url)) return;
    if (this.crawledPages.length >= this.options.maxPages) return;
    if (!this.shouldCrawlUrl(url)) return;
    this.visitedUrls.add(url);
    console.log(`\u{1F578}\uFE0F  Crawling: ${url} (depth: ${depth})`);
    try {
      const response = await axios.get(url, {
        timeout: 1e4,
        headers: {
          "User-Agent": "SecureScan-Crawler/1.0 (Security Scanner)"
        }
      });
      const $ = cheerio.load(response.data);
      const title = $("title").text().trim() || "No Title";
      const links = this.extractLinks($, url);
      const forms = this.extractForms($, url);
      const page = {
        url,
        title,
        links,
        forms,
        depth
      };
      this.crawledPages.push(page);
      for (const link of links) {
        if (this.crawledPages.length < this.options.maxPages && !this.visitedUrls.has(link)) {
          await this.crawlPage(link, depth + 1);
        }
      }
    } catch (error) {
      console.error(`\u274C Error crawling ${url}:`, error.message);
    }
  }
  shouldCrawlUrl(url) {
    try {
      const urlObj = new URL(url);
      const parts = this.baseDomain.split(".");
      const rootDomain = parts.length > 2 ? parts.slice(-2).join(".") : this.baseDomain;
      if (this.options.sameDomainOnly) {
        if (urlObj.hostname !== this.baseDomain) {
          return false;
        }
      } else {
        if (!urlObj.hostname.endsWith(rootDomain)) {
          console.log(`Skipping external URL: ${url} (outside ${rootDomain})`);
          return false;
        }
      }
      for (const pattern of this.options.excludePatterns) {
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          console.log(`Skipping excluded URL: ${url} (contains ${pattern})`);
          return false;
        }
      }
      if (this.options.includePatterns.length > 0) {
        const matchesInclude = this.options.includePatterns.some(
          (pattern) => url.toLowerCase().includes(pattern.toLowerCase())
        );
        const path4 = urlObj.pathname.toLowerCase();
        const isRelevant = this.options.relevantKeywords.some(
          (keyword) => path4.includes(keyword.toLowerCase()) || path4 === "/" || path4 === ""
        );
        if (!matchesInclude && !isRelevant) {
          console.log(`Skipping non-relevant URL: ${url}`);
          return false;
        }
      }
      const path3 = urlObj.pathname.toLowerCase();
      const excludedExtensions = [".css", ".js", ".jpg", ".png", ".gif", ".pdf", ".zip", ".svg", ".ico"];
      if (excludedExtensions.some((ext) => path3.endsWith(ext))) {
        console.log(`Skipping static file: ${url}`);
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  extractLinks($, baseUrl) {
    const links = [];
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          if (this.shouldCrawlUrl(absoluteUrl) && !this.visitedUrls.has(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        } catch (error) {
        }
      }
    });
    return [...new Set(links)];
  }
  extractForms($, baseUrl) {
    const forms = [];
    $("form").each((_, element) => {
      const $form = $(element);
      const action = $form.attr("action") || "";
      const method = $form.attr("method") || "GET";
      try {
        const actionUrl = action ? new URL(action, baseUrl).href : baseUrl;
        const inputs = [];
        $form.find("input, textarea, select").each((_2, input) => {
          const $input = $(input);
          inputs.push({
            name: $input.attr("name"),
            type: $input.attr("type"),
            required: $input.attr("required") !== void 0,
            value: $input.attr("value") || ""
          });
        });
        forms.push({
          action: actionUrl,
          method: method.toUpperCase(),
          inputs: inputs.filter((input) => input.name)
        });
      } catch (error) {
        console.error("Error parsing form:", error.message);
      }
    });
    return forms;
  }
  getCrawlStats() {
    return {
      totalPages: this.crawledPages.length,
      totalForms: this.crawledPages.reduce((sum, page) => sum + page.forms.length, 0),
      totalLinks: this.crawledPages.reduce((sum, page) => sum + page.links.length, 0),
      visitedUrls: this.visitedUrls.size,
      maxDepthReached: Math.max(...this.crawledPages.map((p) => p.depth), 0)
    };
  }
  // Expose crawled pages for external use
  getCrawledPages() {
    return this.crawledPages;
  }
};

// worker-pool.ts
import { Worker } from "worker_threads";
import path from "path";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var WorkerPool = class extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks = /* @__PURE__ */ new Map();
    this.scanStates = /* @__PURE__ */ new Map();
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.nextTaskId = 0;
    this.isProcessing = false;
    this.isShuttingDown = false;
    this.workerCount = options.workerCount ?? 5;
    this.rateLimitDelay = options.rateLimitDelay ?? 500;
    this.maxConcurrentRequests = options.maxConcurrentRequests ?? 10;
    this.initializeWorkers();
  }
  initializeWorkers() {
    const workerPath = path.resolve(__dirname, "scan-worker.cjs");
    for (let i = 0; i < this.workerCount; i++) {
      this.createWorker(i, workerPath);
    }
  }
  createWorker(index, workerPath) {
    if (this.isShuttingDown) return;
    try {
      const worker = new Worker(workerPath, {
        workerData: { workerId: index }
        // Removed execArgv as it can cause issues with .cjs files in some environments
      });
      worker.on("message", (msg) => {
        if (msg && msg.__internal_log) {
          console.log(`WORKER[${index}] internal:`, ...msg.__internal_log.payload || []);
          return;
        }
        this.handleWorkerResult(msg);
      });
      worker.on("error", (err) => {
        console.error(`Worker ${index} error event:`, err);
        this.emit("error", { workerId: index, error: err });
      });
      worker.on("exit", (code) => {
        if (this.isShuttingDown) return;
        if (code !== 0) {
          console.warn(`Worker ${index} exited with code: ${code}`);
          this.emit("workerExit", { workerId: index, code });
          const workerKey = `worker-${index}`;
          const active = this.activeTasks.get(workerKey);
          if (active) {
            const { resolve, reject, id } = active.task;
            reject?.(new Error(`Worker ${index} exited unexpectedly with code ${code}`));
            this.activeTasks.delete(workerKey);
          }
          console.log(`Restarting worker ${index}...`);
          this.workers[index] = null;
          this.createWorker(index, workerPath);
        }
      });
      if (this.workers[index]) {
        this.workers[index] = worker;
      } else {
        this.workers.push(worker);
      }
    } catch (e) {
      console.error(`Failed to create worker ${index}:`, e);
    }
  }
  addTask(task) {
    if (this.isShuttingDown) {
      return Promise.reject(new Error("Worker pool is shutting down"));
    }
    const taskId = task.id || `task-${this.nextTaskId++}`;
    const wrapped = { ...task, id: taskId };
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ ...wrapped, resolve, reject });
      if (task.priority) {
        this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      }
      this.processQueue();
    });
  }
  async processQueue() {
    if (this.isProcessing || this.isShuttingDown) return;
    this.isProcessing = true;
    try {
      while (this.taskQueue.length > 0) {
        if (this.isShuttingDown) break;
        const now = Date.now();
        const sinceLast = now - this.lastRequestTime;
        if (this.requestCount >= this.maxConcurrentRequests) {
          break;
        }
        if (this.requestCount > 0 && sinceLast < this.rateLimitDelay) {
          await new Promise((r) => setTimeout(r, Math.max(this.rateLimitDelay - sinceLast, 50)));
          continue;
        }
        const freeIndex = this.workers.findIndex((w, idx) => w && !this.activeTasks.has(`worker-${idx}`));
        if (freeIndex === -1) {
          break;
        }
        const task = this.taskQueue.shift();
        if (!task) break;
        const workerKey = `worker-${freeIndex}`;
        this.activeTasks.set(workerKey, { task, workerId: freeIndex });
        this.requestCount++;
        this.lastRequestTime = Date.now();
        const { resolve, reject, ...msg } = task;
        try {
          this.workers[freeIndex].postMessage(msg);
        } catch (err) {
          console.error(`Failed to post message to worker ${freeIndex}:`, err);
          reject?.(err);
          this.activeTasks.delete(workerKey);
          this.requestCount--;
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.taskQueue.length > 0 && !this.isShuttingDown) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
  handleWorkerResult(result) {
    const { taskId, success, data, error, workerId } = result;
    this.requestCount = Math.max(0, this.requestCount - 1);
    this.lastRequestTime = Date.now();
    const workerKey = `worker-${workerId}`;
    const entry = this.activeTasks.get(workerKey);
    if (entry && entry.task.id === taskId) {
      const { resolve, reject } = entry.task;
      if (success) resolve?.(result);
      else reject?.(new Error(error || "Worker returned failure"));
      this.activeTasks.delete(workerKey);
    }
    this.emit("result", result);
    if (taskId && taskId.includes("::")) {
      this.updateScanStats(taskId, data);
    }
    this.processQueue();
  }
  updateScanStats(taskId, data) {
    const scanId = taskId.split("::")[0];
    const state = this.scanStates.get(scanId);
    if (state) {
      state.pagesScanned = Math.min(state.pagesScanned + 1, state.totalPages);
      if (data) {
        state.vulnerabilitiesFound += Array.isArray(data.vulnerabilities) ? data.vulnerabilities.length : 0;
        state.formsFound += typeof data.formsFound === "number" ? data.formsFound : 0;
        state.endpointsTested += typeof data.endpointsTested === "number" ? data.endpointsTested : 0;
      }
      const progress = state.totalPages > 0 ? Math.round(state.pagesScanned / state.totalPages * 100) : 0;
      this.emit("progress", {
        scanId,
        status: state.pagesScanned >= state.totalPages ? "completed" : "running",
        progress,
        pagesScanned: state.pagesScanned,
        totalPages: state.totalPages,
        vulnerabilitiesFound: state.vulnerabilitiesFound,
        formsFound: state.formsFound,
        endpointsTested: state.endpointsTested
      });
      if (state.pagesScanned >= state.totalPages) {
        state.status = "completed";
        this.scanStates.delete(scanId);
      }
    }
  }
  async scanPages(scanId, pages) {
    if (this.isShuttingDown) return [];
    const state = {
      scanId,
      totalPages: pages.length,
      pagesScanned: 0,
      vulnerabilitiesFound: 0,
      formsFound: 0,
      endpointsTested: 0,
      startTime: Date.now(),
      status: "running"
    };
    this.scanStates.set(scanId, state);
    const promises = pages.map(
      (p, idx) => this.addTask({
        id: `${scanId}::page-${idx}`,
        type: "scan",
        data: p,
        priority: 1
      })
    );
    const settled = await Promise.allSettled(promises);
    const ok = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
    this.emit("progress", {
      scanId,
      status: "completed",
      progress: 100,
      pagesScanned: state.pagesScanned,
      totalPages: state.totalPages,
      vulnerabilitiesFound: state.vulnerabilitiesFound,
      formsFound: state.formsFound,
      endpointsTested: state.endpointsTested
    });
    return ok;
  }
  getStats() {
    return {
      workerCount: this.workerCount,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      requestCount: this.requestCount
    };
  }
  async shutdown() {
    this.isShuttingDown = true;
    while (this.activeTasks.size > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await Promise.all(this.workers.map((w) => w ? w.terminate() : Promise.resolve()));
    this.workers = [];
  }
};

// vulnerability-scanner.ts
var VulnerabilityScanner = class {
  /**
   * Creates a new instance of the VulnerabilityScanner.
   * 
   * @param url - The target URL to scan.
   * @param scanId - The unique ID of the scan session.
   * @param wsServer - Optional WebSocket server for real-time progress updates.
   */
  constructor(url, scanId, wsServer) {
    // Changed from url
    this.vulnerabilities = [];
    this.formsFound = 0;
    this.endpointsTested = 0;
    this.pagesScanned = 0;
    this.crawledPages = [];
    this.url = url;
    this.scanId = scanId;
    this.wsServer = wsServer;
    this.scanStartTime = Date.now();
    const urlObj = new URL2(url);
    const baseDomain = urlObj.hostname;
    this.crawler = new SmartWebCrawler({
      maxDepth: 2,
      maxPages: 15,
      sameDomainOnly: false,
      // Allow external crawling for testing
      includePatterns: [
        "dashboard",
        "admin",
        "settings",
        "profile",
        "account",
        "home",
        "index",
        "main",
        "login",
        "register",
        "users",
        "products",
        "services",
        "pages",
        "api",
        "v1",
        "v2",
        "endpoints",
        "phone",
        "agents",
        "vulnweb.com",
        "testphp",
        "testhtml5",
        "testasp",
        "testaspnet",
        "guestbook",
        "cart",
        "categories",
        "artists",
        "disclaimer"
      ]
    });
    this.workerPool = new WorkerPool({
      workerCount: 5,
      rateLimitDelay: 2e3,
      // 2 seconds between requests
      maxConcurrentRequests: 10
    });
  }
  async scan() {
    try {
      console.log(`Starting comprehensive vulnerability scan for: ${this.url}`);
      console.log("\u{1F577}\uFE0F  Starting web crawling...");
      this.crawledPages = await this.crawler.crawl(this.url);
      this.crawledPages = this.crawler.getCrawledPages().sort((a, b) => a.url.localeCompare(b.url));
      console.log(`\u{1F577}\uFE0F  Crawling completed. ${this.crawledPages.length} pages ready for scanning.`);
      if (this.wsServer && this.scanId) {
        this.wsServer.updateCrawlingProgress(this.scanId, this.crawledPages.length);
      }
      console.log("\u{1F680} Starting concurrent page scanning with worker pool...");
      let completedPages = 0;
      let currentVulns = 0;
      let currentForms = 0;
      let currentEndpoints = 0;
      const progressListener = (result) => {
        completedPages++;
        if (result.success && result.data) {
          currentVulns += result.data.vulnerabilities?.length || 0;
          currentForms += result.data.formsFound || 0;
          currentEndpoints += result.data.endpointsTested || 0;
        }
        if (this.wsServer && this.scanId) {
          this.wsServer.updateScanningProgress(
            this.scanId,
            completedPages,
            currentVulns,
            currentForms,
            currentEndpoints,
            this.vulnerabilities
            // Pass current vulnerabilities
          );
        }
      };
      this.workerPool.on("result", progressListener);
      const results = await this.workerPool.scanPages(this.scanId, this.crawledPages);
      this.workerPool.off("result", progressListener);
      for (const result of results) {
        if (result.success && result.data) {
          if (result.data.vulnerabilities && Array.isArray(result.data.vulnerabilities)) {
            this.vulnerabilities.push(...result.data.vulnerabilities);
          }
          this.formsFound += result.data.formsFound || 0;
          this.endpointsTested += result.data.endpointsTested || 0;
          this.pagesScanned++;
        }
      }
      this.vulnerabilities = this.vulnerabilities.filter(
        (vuln, index, self) => index === self.findIndex((v) => v.id === vuln.id)
      );
      const scanTime = Date.now() - this.scanStartTime;
      const crawlStats = this.crawler.getCrawlStats();
      console.log(`\u2705 Comprehensive scan completed!`);
      console.log(`\u{1F4CA} Found ${this.vulnerabilities.length} vulnerabilities across ${this.pagesScanned} pages`);
      await this.workerPool.shutdown();
      await storage.updateScan(this.scanId, {
        vulnerabilities: this.vulnerabilities,
        pagesScanned: this.pagesScanned,
        formsFound: this.formsFound,
        endpointsTested: this.endpointsTested,
        status: "completed"
      });
      return {
        vulnerabilities: this.vulnerabilities,
        scanTime,
        formsFound: this.formsFound,
        endpointsTested: this.endpointsTested,
        pagesScanned: this.pagesScanned,
        crawlStats
      };
    } catch (error) {
      console.error("Scan error:", error);
      if (this.workerPool) {
        await this.workerPool.shutdown();
      }
      throw new Error(`Failed to scan ${this.url}: ${error.message}`);
    }
  }
  async fetchPage(url) {
    try {
      return await axios2.get(url, {
        timeout: 1e4,
        headers: {
          "User-Agent": "SecureScan-Vulnerability-Scanner/1.0"
        },
        validateStatus: (status) => status < 500
      });
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }
  async scanPage(page) {
    try {
      const response = await this.fetchPage(page.url);
      const $ = cheerio2.load(response.data);
      const dom = new JSDOM(response.data);
      await this.scanForXSS($, dom, page.url);
      await this.scanForSQLInjection($, page.url);
      await this.scanForCSRF($, dom, page.url);
      await this.scanForInformationDisclosure(response, page.url);
      for (const form of page.forms) {
        await this.scanFormForVulnerabilities(form, page.url);
      }
    } catch (error) {
      console.error(`\u274C Error scanning page ${page.url}:`, error.message);
    }
  }
  async scanFormForVulnerabilities(form, pageUrl) {
    try {
      for (const input of form.inputs) {
        if (input.name) {
          await this.testXSSPayload(form.action, form.method, input.name, pageUrl);
          await this.testSQLInjection(form.action, form.method, input.name, pageUrl);
        }
      }
    } catch (error) {
      console.error(`\u274C Error scanning form on ${pageUrl}:`, error.message);
    }
  }
  async scanForXSS($, dom, pageUrl) {
    console.log(`Scanning for XSS vulnerabilities on: ${pageUrl}`);
    const forms = $("form");
    this.formsFound += forms.length;
    for (let i = 0; i < forms.length; i++) {
      const form = forms.eq(i);
      const action = form.attr("action") || pageUrl;
      const method = (form.attr("method") || "GET").toUpperCase();
      const inputs = form.find('input[type="text"], input[type="search"], textarea');
      for (let j = 0; j < inputs.length; j++) {
        const input = inputs.eq(j);
        const inputName = input.attr("name");
        if (inputName) {
          await this.testXSSPayload(action, method, inputName, pageUrl);
        }
      }
    }
    const url = new URL2(pageUrl);
    for (const [param, value] of url.searchParams) {
      await this.testURLXSS(pageUrl, param);
    }
    this.checkForExistingXSS($, dom, pageUrl);
  }
  async testXSSPayload(action, method, inputName, pageUrl) {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><img src=x onerror=alert("XSS")>',
      `<iframe src="javascript:alert('XSS')"></iframe>`
    ];
    for (const payload of xssPayloads) {
      try {
        const url = action.startsWith("http") ? action : new URL2(action, pageUrl).href;
        const params = new URLSearchParams();
        params.append(inputName, payload);
        this.endpointsTested++;
        let response;
        if (method === "POST") {
          response = await axios2.post(url, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 5e3
          });
        } else {
          response = await axios2.get(`${url}?${params.toString()}`, { timeout: 5e3 });
        }
        if (this.containsPayload(response.data, payload)) {
          this.addVulnerability({
            id: `xss-${Date.now()}`,
            name: "Cross-Site Scripting (XSS)",
            severity: "High",
            description: `Reflected XSS vulnerability found in form input "${inputName}" on page ${pageUrl}. User input is not properly sanitized before being reflected in the response.`,
            location: `${method} ${url}`,
            impact: "Malicious scripts could be executed in users' browsers, potentially stealing session tokens or performing actions on behalf of users.",
            category: "XSS"
          });
          break;
        }
      } catch (error) {
      }
    }
  }
  async testURLXSS(url, param) {
    const xssPayload = '<script>alert("XSS")</script>';
    const testUrl = new URL2(url);
    testUrl.searchParams.set(param, xssPayload);
    try {
      this.endpointsTested++;
      const response = await axios2.get(testUrl.toString(), { timeout: 5e3 });
      if (this.containsPayload(response.data, xssPayload)) {
        this.addVulnerability({
          id: `url-xss-${Date.now()}`,
          name: "Cross-Site Scripting (XSS)",
          severity: "High",
          description: `Reflected XSS vulnerability found in URL parameter "${param}". User input is not properly sanitized before being reflected in the response.`,
          location: `GET ${testUrl.pathname}`,
          impact: "Malicious scripts could be executed in users' browsers, potentially stealing session tokens or performing actions on behalf of users.",
          category: "XSS"
        });
      }
    } catch (error) {
    }
  }
  checkForExistingXSS($, dom, pageUrl) {
    const scripts = $("script");
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts.eq(i).html() || "";
      if (script.includes("innerHTML") || script.includes("document.write")) {
        this.addVulnerability({
          id: `dom-xss-${Date.now()}`,
          name: "DOM-Based Cross-Site Scripting (XSS)",
          severity: "High",
          description: `Potentially dangerous DOM manipulation detected on page ${pageUrl}. The page uses innerHTML or document.write which could lead to DOM-based XSS if user input is involved.`,
          location: "Inline JavaScript",
          impact: "Malicious scripts could be executed in users' browsers through DOM manipulation, potentially stealing session tokens or performing actions on behalf of users.",
          category: "XSS"
        });
      }
    }
  }
  async scanForSQLInjection($, pageUrl) {
    console.log(`Scanning for SQL Injection vulnerabilities on: ${pageUrl}`);
    const forms = $("form");
    for (let i = 0; i < forms.length; i++) {
      const form = forms.eq(i);
      const action = form.attr("action") || pageUrl;
      const method = (form.attr("method") || "GET").toUpperCase();
      const inputs = form.find('input[type="text"], input[type="password"], input[type="email"], textarea');
      for (let j = 0; j < inputs.length; j++) {
        const input = inputs.eq(j);
        const inputName = input.attr("name");
        if (inputName) {
          await this.testSQLInjection(action, method, inputName, pageUrl);
        }
      }
    }
  }
  async testSQLInjection(action, method, inputName, pageUrl) {
    const sqlPayloads = [
      "' OR '1'='1",
      "' OR 1=1--",
      "'; DROP TABLE users;--",
      "' UNION SELECT null, null, null--",
      "admin'--",
      "admin' #",
      "admin'/*",
      "' or 1=1#",
      "' or 1=1--",
      "' or 1=1/*",
      "') or '1'='1--",
      "') or ('1'='1--"
    ];
    for (const payload of sqlPayloads) {
      try {
        const url = action.startsWith("http") ? action : new URL2(action, pageUrl).href;
        const params = new URLSearchParams();
        params.append(inputName, payload);
        this.endpointsTested++;
        let response;
        if (method === "POST") {
          response = await axios2.post(url, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 5e3
          });
        } else {
          response = await axios2.get(`${url}?${params.toString()}`, { timeout: 5e3 });
        }
        if (this.containsSQLError(response.data)) {
          this.addVulnerability({
            id: `sqli-${Date.now()}`,
            name: "SQL Injection",
            severity: "Critical",
            description: `SQL Injection vulnerability found in form input "${inputName}" on page ${pageUrl}. The application appears to be vulnerable to SQL injection attacks.`,
            location: `${method} ${url}`,
            impact: "Attackers could potentially access, modify, or delete database contents, including sensitive user information.",
            category: "SQL Injection"
          });
          break;
        }
      } catch (error) {
        if (error.response && this.containsSQLError(error.response.data)) {
          this.addVulnerability({
            id: `sqli-${Date.now()}`,
            name: "SQL Injection",
            severity: "Critical",
            description: `SQL Injection vulnerability found in form input "${inputName}" on page ${pageUrl}. SQL error detected in response.`,
            location: `${method} ${action}`,
            impact: "Attackers could potentially access, modify, or delete database contents, including sensitive user information.",
            category: "SQL Injection"
          });
          break;
        }
      }
    }
  }
  async scanForCSRF($, dom, pageUrl) {
    console.log(`Scanning for CSRF vulnerabilities on: ${pageUrl}`);
    const forms = $("form");
    for (let i = 0; i < forms.length; i++) {
      const form = forms.eq(i);
      const action = form.attr("action") || pageUrl;
      const method = (form.attr("method") || "GET").toUpperCase();
      const csrfTokens = form.find('input[type="hidden"][name*="csrf"], input[type="hidden"][name*="token"]');
      const hasCSRFToken = csrfTokens.length > 0;
      const sensitiveInputs = form.find('input[type="password"], input[name*="password"], input[name*="email"]');
      const hasSensitiveData = sensitiveInputs.length > 0;
      if (method === "POST" && hasSensitiveData && !hasCSRFToken) {
        this.addVulnerability({
          id: `csrf-${Date.now()}`,
          name: "Cross-Site Request Forgery (CSRF)",
          severity: "Medium",
          description: `CSRF protection missing on sensitive form on page ${pageUrl}. State-changing operations can be performed without proper token validation.`,
          location: `POST ${action}`,
          impact: "Attackers could trick users into performing unintended actions like changing account settings or making transactions.",
          category: "CSRF"
        });
      }
    }
  }
  async scanForInformationDisclosure(response, pageUrl) {
    console.log(`Scanning for information disclosure on: ${pageUrl}`);
    const serverHeader = response.headers["server"];
    if (serverHeader && serverHeader.includes("Apache")) {
      this.addVulnerability({
        id: `info-${Date.now()}`,
        name: "Information Disclosure - Server Version",
        severity: "Low",
        description: `Server version is disclosed in HTTP headers on page ${pageUrl}. This information could help attackers identify potential vulnerabilities.`,
        location: "HTTP Response Headers",
        impact: "Attackers could use this information to identify specific vulnerabilities for the disclosed server version.",
        category: "Information Disclosure"
      });
    }
    const errorPatterns = [
      /mysql_fetch_array/,
      /ORA-[0-9]{5}/,
      /Microsoft OLE DB Provider/,
      /PostgreSQL query failed/,
      /Warning:.*mysql_.*/
    ];
    for (const pattern of errorPatterns) {
      if (pattern.test(response.data)) {
        this.addVulnerability({
          id: `error-${Date.now()}`,
          name: "Information Disclosure - Error Messages",
          severity: "Medium",
          description: `Detailed error messages are exposed on page ${pageUrl}, potentially revealing system information.`,
          location: "Application Response",
          impact: "Attackers could use error messages to gather information about the underlying system and database.",
          category: "Information Disclosure"
        });
        break;
      }
    }
  }
  containsPayload(responseData, payload) {
    return responseData.toLowerCase().includes(payload.toLowerCase());
  }
  containsSQLError(responseData) {
    const sqlErrors = [
      "mysql_fetch_array",
      "ORA-",
      "Microsoft OLE DB Provider",
      "PostgreSQL query failed",
      "Warning: mysql_",
      "SQL syntax",
      "mysql_error",
      "valid MySQL result",
      "MySqlClient"
    ];
    const lowerData = responseData.toLowerCase();
    return sqlErrors.some((error) => lowerData.includes(error.toLowerCase()));
  }
  addVulnerability(vulnerability) {
    const exists = this.vulnerabilities.some(
      (v) => v.name === vulnerability.name && v.location === vulnerability.location
    );
    if (!exists) {
      this.vulnerabilities.push(vulnerability);
    }
  }
};

// routes.ts
async function performVulnerabilityScan(url, scanId, wsServer) {
  try {
    console.log(`Starting comprehensive vulnerability scan for: ${url}`);
    if (wsServer) {
      wsServer.startScan(scanId, url, 0);
    }
    const scanner = new VulnerabilityScanner(url, scanId, wsServer);
    const result = await scanner.scan();
    console.log(`Scan completed in ${result.scanTime}ms`);
    console.log(`Pages scanned: ${result.pagesScanned}`);
    console.log(`Forms found: ${result.formsFound}`);
    console.log(`Endpoints tested: ${result.endpointsTested}`);
    console.log(`Vulnerabilities found: ${result.vulnerabilities.length}`);
    return {
      vulnerabilities: result.vulnerabilities,
      pagesScanned: result.pagesScanned,
      crawlStats: result.crawlStats || {}
    };
  } catch (error) {
    console.error("Vulnerability scan failed:", error);
    if (wsServer) {
      wsServer.errorScan(scanId, `Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      vulnerabilities: [{
        id: "scan-error",
        name: "Scan Error",
        severity: "Low",
        description: `Unable to scan the target website: ${error instanceof Error ? error.message : String(error)}. This could be due to network issues, the website being down, or the website blocking automated scanning.`,
        location: url,
        impact: "No vulnerabilities could be detected due to scan failure. Manual testing may be required.",
        category: "Information Disclosure"
      }],
      pagesScanned: 0,
      crawlStats: {}
    };
  }
}
async function callOllama(prompt) {
  if (prompt.includes("fix for this")) {
    return `Here is a recommended fix for this vulnerability:

1. **Input Validation**: Ensure all user inputs are strictly validated against a whitelist of allowed characters.
2. **Output Encoding**: Encode all data before rendering it to the browser to prevent XSS.
3. **Prepared Statements**: Use parameterized queries for all database interactions to prevent SQL Injection.
4. **Security Headers**: Implement Content Security Policy (CSP) and other security headers.

Example Code (Generic):
\`\`\`javascript
// Input Validation
if (!/^[a-zA-Z0-9]+$/.test(input)) {
  throw new Error("Invalid input");
}

// Output Encoding
const safeOutput = escapeHtml(userInput);
\`\`\`

*Note: This is a generated recommendation. Please review carefully before applying to production.*`;
  }
  return "I am an AI security assistant. I can help you understand vulnerabilities and recommend best practices for securing your application. How can I assist you today?";
}
async function registerRoutes(app2) {
  app2.post("/api/scans", async (req, res) => {
    try {
      const validatedData = insertScanSchema.parse(req.body);
      const scan = await storage.createScan(validatedData);
      setTimeout(async () => {
        try {
          await storage.updateScan(scan.id, { status: "scanning" });
          const wsServer = global.wsServer;
          const scanResult = await performVulnerabilityScan(scan.url, scan.id, wsServer);
          await storage.updateScan(scan.id, {
            status: "completed",
            vulnerabilities: scanResult.vulnerabilities,
            pagesScanned: scanResult.pagesScanned,
            crawlStats: scanResult.crawlStats,
            completedAt: /* @__PURE__ */ new Date()
          });
          if (wsServer) {
            wsServer.completeScan(scan.id, {
              pagesScanned: scanResult.pagesScanned,
              vulnerabilities: scanResult.vulnerabilities,
              formsFound: scanResult.formsFound || 0,
              // Ensure these properties exist or are passed
              endpointsTested: scanResult.endpointsTested || 0
            });
          }
        } catch (error) {
          console.error("Scan error:", error);
          await storage.updateScan(scan.id, { status: "failed" });
        }
      }, 100);
      res.json(scan);
    } catch (error) {
      res.status(400).json({ message: "Invalid scan data", error });
    }
  });
  app2.get("/api/scans/:id", async (req, res) => {
    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }
    res.json(scan);
  });
  app2.get("/api/scans", async (req, res) => {
    const scans2 = await storage.getScans();
    res.json(scans2);
  });
  app2.get("/api/scans/:id/export", async (req, res) => {
    const { id } = req.params;
    const { format } = req.query;
    try {
      const scan = await storage.getScan(id);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      if (format === "json") {
        res.setHeader("Content-Disposition", `attachment; filename="scan-${id}.json"`);
        res.setHeader("Content-Type", "application/json");
        return res.json(scan);
      }
      if (format === "pdf") {
        const doc = new PDFDocument({
          margin: 50,
          size: "A4"
        });
        res.setHeader("Content-Disposition", `attachment; filename="scan-${id}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.fontSize(60).font("Helvetica-Bold").fillColor("#10b981").text("WIKI", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(24).font("Helvetica").fillColor("#000000").text("Security Vulnerability Scan Report", { align: "center" });
        doc.moveDown(2);
        doc.moveDown(2);
        doc.fontSize(12).fillColor("#000000").text("Scan Information", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Target URL: ${scan.url}`, { continued: false });
        doc.text(`Scan Date: ${new Date(scan.createdAt || Date.now()).toLocaleString()}`);
        doc.text(`Status: ${scan.status}`);
        doc.text(`Pages Scanned: ${scan.pagesScanned || 0}`);
        doc.moveDown(2);
        const vulnerabilities = Array.isArray(scan.vulnerabilities) ? scan.vulnerabilities : [];
        const severityCounts = {
          Critical: vulnerabilities.filter((v) => v.severity === "Critical").length,
          High: vulnerabilities.filter((v) => v.severity === "High").length,
          Medium: vulnerabilities.filter((v) => v.severity === "Medium").length,
          Low: vulnerabilities.filter((v) => v.severity === "Low").length
        };
        doc.fontSize(12).fillColor("#000000").text("Vulnerability Summary", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.fillColor("#dc2626").text(`Critical: ${severityCounts.Critical}`);
        doc.fillColor("#ea580c").text(`High: ${severityCounts.High}`);
        doc.fillColor("#ca8a04").text(`Medium: ${severityCounts.Medium}`);
        doc.fillColor("#16a34a").text(`Low: ${severityCounts.Low}`);
        doc.moveDown(2);
        if (vulnerabilities.length > 0) {
          doc.fontSize(12).fillColor("#000000").text("Detected Vulnerabilities", { underline: true });
          doc.moveDown();
          vulnerabilities.forEach((vuln, index) => {
            if (doc.y > 700) {
              doc.addPage();
            }
            doc.fontSize(11).fillColor("#000000").text(`${index + 1}. ${vuln.name}`, { underline: true });
            doc.moveDown(0.3);
            const severityColor = vuln.severity === "Critical" ? "#dc2626" : vuln.severity === "High" ? "#ea580c" : vuln.severity === "Medium" ? "#ca8a04" : "#16a34a";
            doc.fontSize(9).fillColor(severityColor).text(`Severity: ${vuln.severity}`, { continued: true }).fillColor("#000000").text(`  |  Category: ${vuln.category || "Unknown"}`);
            doc.moveDown(0.3);
            doc.fontSize(9).fillColor("#666666").text(`Location: ${vuln.location}`);
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor("#000000").text("Description:", { underline: true });
            doc.fontSize(9).fillColor("#333333").text(vuln.description, {
              width: 500,
              align: "left"
            });
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor("#000000").text("Impact:", { underline: true });
            doc.fontSize(9).fillColor("#333333").text(vuln.impact, {
              width: 500,
              align: "left"
            });
            doc.moveDown(1.5);
          });
        } else {
          doc.fontSize(10).fillColor("#16a34a").text("No vulnerabilities detected. The target appears to be secure.");
        }
        doc.fontSize(8).fillColor("#999999").text(
          `Report generated on ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
          50,
          doc.page.height - 50,
          { align: "center" }
        );
        doc.end();
        return;
      }
      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "WIKI Security Scanner";
        const worksheet = workbook.addWorksheet("Vulnerabilities");
        worksheet.columns = [
          { header: "ID", key: "id", width: 30 },
          { header: "Name", key: "name", width: 30 },
          { header: "Severity", key: "severity", width: 15 },
          { header: "Location", key: "location", width: 30 },
          { header: "Description", key: "description", width: 50 },
          { header: "Impact", key: "impact", width: 40 }
        ];
        const vulnerabilities = Array.isArray(scan.vulnerabilities) ? scan.vulnerabilities : [];
        vulnerabilities.forEach((vuln) => {
          worksheet.addRow(vuln);
        });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="scan-${id}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
        return;
      }
      res.status(400).json({ message: "Unsupported export format" });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const chatMessage = await storage.createChatMessage(validatedData);
      const securityPrompt = `You are a cybersecurity expert. Answer the following security question with practical, actionable advice: ${validatedData.message}`;
      const response = await callOllama(securityPrompt);
      const updatedMessage = await storage.updateChatMessage(chatMessage.id, { response });
      res.json(updatedMessage);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat message", error });
    }
  });
  app2.post("/api/vulnerabilities/:id/fix", async (req, res) => {
    const { vulnerability } = req.body;
    if (!vulnerability) {
      return res.status(400).json({ message: "Vulnerability data required" });
    }
    const fixPrompt = `Generate a detailed fix for this ${vulnerability.category} vulnerability: ${vulnerability.description}. Provide specific code examples and best practices.`;
    const fix = await callOllama(fixPrompt);
    res.json({ fix });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// websocket-server.ts
import { Server as SocketIOServer } from "socket.io";
var WebSocketServer = class {
  constructor(server) {
    this.scanProgress = /* @__PURE__ */ new Map();
    this.workerPool = null;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          "https://www.wikiscan.dev",
          "https://wikiscan.dev",
          "https://wiki-client-i978dzgi8-23051977-8870s-projects.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.setupEventHandlers();
  }
  setWorkerPool(workerPool) {
    this.workerPool = workerPool;
    this.setupWorkerPoolListeners();
  }
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);
      socket.on("join-scan", (scanId) => {
        socket.join(`scan-${scanId}`);
        console.log(`Client ${socket.id} joined scan room: ${scanId}`);
        const progress = this.scanProgress.get(scanId);
        if (progress) {
          socket.emit("scan-progress", progress);
        }
      });
      socket.on("leave-scan", (scanId) => {
        socket.leave(`scan-${scanId}`);
        console.log(`Client ${socket.id} left scan room: ${scanId}`);
      });
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  setupWorkerPoolListeners() {
    if (!this.workerPool) return;
    this.workerPool.on("result", (result) => {
    });
    this.workerPool.on("error", (error) => {
      console.error("Worker pool error:", error);
      this.io.emit("scan-error", {
        message: "Worker pool encountered an error",
        details: error
      });
    });
  }
  startScan(scanId, targetUrl, totalPages) {
    const startTime = Date.now();
    const initialProgress = {
      scanId,
      status: "crawling",
      progress: 0,
      pagesScanned: 0,
      totalPages,
      vulnerabilitiesFound: 0,
      formsFound: 0,
      endpointsTested: 0,
      estimatedTimeRemaining: this.calculateEstimatedTime(0, totalPages, startTime),
      startTime,
      currentStage: "Crawling website..."
    };
    this.scanProgress.set(scanId, initialProgress);
    this.broadcastProgress(scanId, initialProgress);
  }
  updateCrawlingProgress(scanId, pagesFound) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;
    progress.pagesScanned = pagesFound;
    progress.totalPages = Math.max(progress.totalPages, pagesFound);
    progress.progress = Math.round(pagesFound / Math.max(progress.totalPages, 1) * 30);
    progress.currentStage = `Found ${pagesFound} pages to scan...`;
    progress.estimatedTimeRemaining = this.calculateEstimatedTime(progress.progress, progress.totalPages, progress.startTime);
    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }
  updateScanningProgress(scanId, pagesScanned, vulnerabilitiesFound, formsFound, endpointsTested, vulnerabilities) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;
    progress.pagesScanned = pagesScanned;
    progress.vulnerabilitiesFound = vulnerabilitiesFound;
    progress.formsFound = formsFound;
    progress.formsFound = formsFound;
    progress.endpointsTested = endpointsTested;
    if (vulnerabilities) {
      progress.vulnerabilities = vulnerabilities;
    }
    const scanningProgress = pagesScanned / Math.max(progress.totalPages, 1) * 70;
    progress.progress = Math.round(30 + scanningProgress);
    progress.currentStage = `Scanning page ${pagesScanned} of ${progress.totalPages}...`;
    progress.estimatedTimeRemaining = this.calculateEstimatedTime(progress.progress, progress.totalPages, progress.startTime);
    progress.status = pagesScanned >= progress.totalPages ? "completed" : "scanning";
    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }
  completeScan(scanId, finalStats) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;
    progress.pagesScanned = finalStats.pagesScanned || progress.pagesScanned;
    progress.vulnerabilitiesFound = finalStats.vulnerabilities?.length || 0;
    progress.formsFound = finalStats.formsFound || 0;
    progress.endpointsTested = finalStats.endpointsTested || 0;
    progress.vulnerabilities = finalStats.vulnerabilities || [];
    progress.progress = 100;
    progress.estimatedTimeRemaining = 0;
    progress.status = "completed";
    progress.currentStage = "Scan completed!";
    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }
  errorScan(scanId, error) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;
    progress.status = "error";
    progress.currentStage = `Error: ${error}`;
    progress.estimatedTimeRemaining = 0;
    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
    this.io.to(`scan-${scanId}`).emit("scan-error", {
      message: error,
      scanId
    });
  }
  calculateEstimatedTime(currentProgress, totalPages, startTime) {
    if (currentProgress <= 0) return 0;
    const elapsed = Date.now() - startTime;
    const progressPerMs = currentProgress / elapsed;
    const remainingProgress = 100 - currentProgress;
    return Math.round(remainingProgress / progressPerMs / 1e3);
  }
  broadcastProgress(scanId, progress) {
    this.io.to(`scan-${scanId}`).emit("scan-progress", progress);
  }
  getScanProgress(scanId) {
    return this.scanProgress.get(scanId);
  }
  cleanup(scanId) {
    this.scanProgress.delete(scanId);
  }
};

// index.ts
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
var allowedOrigins = [
  "https://www.wikiscan.dev",
  "https://wikiscan.dev",
  "https://wiki-client-i978dzgi8-23051977-8870s-projects.vercel.app",
  "http://localhost:5173",
  "https://wiki-scanner-07c94b203146.herokuapp.com"
];
var app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.options("*", cors());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
(async () => {
  const server = await registerRoutes(app);
  const wsServer = new WebSocketServer(server);
  global.wsServer = wsServer;
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });
  if (process.env.NODE_ENV === "production") {
    const distPath = path2.resolve(__dirname2, "../../client/dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  const port = Number(process.env.PORT || 5e3);
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });
})();
