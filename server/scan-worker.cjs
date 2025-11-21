// server/scan-worker.cjs
const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL, URLSearchParams } = require('url');

// Prevent worker from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error(`Worker ${workerData?.workerId} uncaught exception:`, err);
});

/**
 * Robust Scan Worker
 * Implements full vulnerability scanning logic:
 * - Reflected XSS (URL & Forms)
 * - SQL Injection (URL & Forms)
 * - CSRF
 * - Information Disclosure
 * - DOM XSS
 */

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '"><script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  '"><img src=x onerror=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>'
];

const SQL_PAYLOADS = [
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

const SQL_ERRORS = [
  'mysql_fetch_array',
  'ORA-',
  'Microsoft OLE DB Provider',
  'PostgreSQL query failed',
  'Warning: mysql_',
  'SQL syntax',
  'mysql_error',
  'valid MySQL result',
  'MySqlClient',
  'syntax error'
];

async function fetchPage(url, options = {}) {
  try {
    const res = await axios({
      url,
      method: options.method || 'GET',
      data: options.data,
      params: options.params,
      headers: {
        'User-Agent': 'SecureScan-Worker/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': options.headers?.['Content-Type']
      },
      timeout: 10000,
      validateStatus: status => status < 500
    });
    return res;
  } catch (err) {
    // Return error response if available (for SQLi checks)
    if (err.response) return err.response;
    throw new Error(`fetch error: ${err.message}`);
  }
}

function containsPayload(html, payload) {
  if (!html || typeof html !== 'string') return false;
  return html.toLowerCase().includes(payload.toLowerCase());
}

function containsSQLError(html) {
  if (!html || typeof html !== 'string') return false;
  const lower = html.toLowerCase();
  return SQL_ERRORS.some(err => lower.includes(err.toLowerCase()));
}

/**
 * Scans a single page for various vulnerabilities.
 * 
 * @param {object} page - The page object containing URL.
 * @returns {Promise<object>} The scan result.
 */
async function scanPage(page) {
  const result = {
    vulnerabilities: [],
    formsFound: 0,
    endpointsTested: 0,
    pageUrl: page.url
  };

  let response;
  try {
    response = await fetchPage(page.url);
  } catch (err) {
    return { success: false, error: err.message, data: result };
  }

  const html = response.data;
  if (typeof html !== 'string') {
    return { success: true, data: result };
  }

  const $ = cheerio.load(html);
  const forms = $('form');
  result.formsFound = forms.length;

  // 1. Scan Forms
  for (let i = 0; i < forms.length; i++) {
    const form = forms.eq(i);
    const action = form.attr('action') || page.url;
    const method = (form.attr('method') || 'GET').toUpperCase();

    // Resolve action URL
    let targetUrl;
    try {
      targetUrl = new URL(action, page.url).href;
    } catch (e) {
      targetUrl = page.url;
    }

    // CSRF Check
    const csrfTokens = form.find('input[type="hidden"][name*="csrf"], input[type="hidden"][name*="token"]');
    const sensitiveInputs = form.find('input[type="password"], input[name*="password"], input[name*="email"]');
    if (method === 'POST' && sensitiveInputs.length > 0 && csrfTokens.length === 0) {
      result.vulnerabilities.push({
        id: `csrf-${Date.now()}-${Math.random()}`,
        name: 'Cross-Site Request Forgery (CSRF)',
        severity: 'Medium',
        description: `CSRF protection missing on sensitive form at ${targetUrl}`,
        location: `POST ${targetUrl}`,
        impact: 'Attackers could perform actions on behalf of users.',
        category: 'CSRF'
      });
    }

    // Input Fuzzing (XSS & SQLi)
    const inputs = form.find('input:not([type="hidden"]), textarea');
    for (let j = 0; j < inputs.length; j++) {
      const input = inputs.eq(j);
      const name = input.attr('name');
      if (!name) continue;

      // XSS Test
      for (const payload of XSS_PAYLOADS) {
        try {
          result.endpointsTested++;
          const params = new URLSearchParams();
          // Fill other inputs with dummy data
          inputs.each((_, el) => {
            const otherName = $(el).attr('name');
            if (otherName && otherName !== name) params.append(otherName, 'test');
          });
          params.append(name, payload);

          let res;
          if (method === 'POST') {
            res = await fetchPage(targetUrl, {
              method: 'POST',
              data: params.toString(),
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
          } else {
            res = await fetchPage(`${targetUrl}?${params.toString()}`);
          }

          if (containsPayload(res.data, payload)) {
            result.vulnerabilities.push({
              id: `xss-${Date.now()}-${Math.random()}`,
              name: 'Reflected XSS',
              severity: 'High',
              description: `Reflected XSS in form input "${name}"`,
              location: `${method} ${targetUrl}`,
              impact: 'Malicious scripts execution.',
              category: 'XSS'
            });
            break; // Stop testing this input for XSS
          }
        } catch (e) { }
      }

      // SQLi Test
      for (const payload of SQL_PAYLOADS) {
        try {
          result.endpointsTested++;
          const params = new URLSearchParams();
          inputs.each((_, el) => {
            const otherName = $(el).attr('name');
            if (otherName && otherName !== name) params.append(otherName, '1');
          });
          params.append(name, payload);

          let res;
          if (method === 'POST') {
            res = await fetchPage(targetUrl, {
              method: 'POST',
              data: params.toString(),
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
          } else {
            res = await fetchPage(`${targetUrl}?${params.toString()}`);
          }

          if (containsSQLError(res.data)) {
            result.vulnerabilities.push({
              id: `sqli-${Date.now()}-${Math.random()}`,
              name: 'SQL Injection',
              severity: 'Critical',
              description: `SQL Injection in form input "${name}"`,
              location: `${method} ${targetUrl}`,
              impact: 'Database compromise.',
              category: 'SQL Injection'
            });
            break;
          }
        } catch (e) { }
      }
    }
  }

  // 2. Scan URL Parameters
  try {
    const u = new URL(page.url);
    for (const [param] of u.searchParams) {
      // XSS
      const xssPayload = '<script>alert("XSS")</script>';
      result.endpointsTested++;
      const testUrlXss = new URL(page.url);
      testUrlXss.searchParams.set(param, xssPayload);
      try {
        const res = await fetchPage(testUrlXss.toString());
        if (containsPayload(res.data, xssPayload)) {
          result.vulnerabilities.push({
            id: `url-xss-${Date.now()}-${Math.random()}`,
            name: 'Reflected XSS (URL)',
            severity: 'High',
            description: `Reflected XSS in URL parameter "${param}"`,
            location: `GET ${testUrlXss.href}`,
            impact: 'Malicious scripts execution.',
            category: 'XSS'
          });
        }
      } catch (e) { }

      // SQLi
      const sqliPayload = "'";
      result.endpointsTested++;
      const testUrlSql = new URL(page.url);
      testUrlSql.searchParams.set(param, sqliPayload);
      try {
        const res = await fetchPage(testUrlSql.toString());
        if (containsSQLError(res.data)) {
          result.vulnerabilities.push({
            id: `url-sqli-${Date.now()}-${Math.random()}`,
            name: 'SQL Injection (URL)',
            severity: 'Critical',
            description: `SQL Injection in URL parameter "${param}"`,
            location: `GET ${testUrlSql.href}`,
            impact: 'Database compromise.',
            category: 'SQL Injection'
          });
        }
      } catch (e) { }
    }
  } catch (e) { }

  // 3. Passive Checks (DOM XSS, Info Disclosure)
  // DOM XSS
  $('script').each((i, el) => {
    const s = $(el).html() || '';
    if (s.includes('innerHTML') || s.includes('document.write')) {
      result.vulnerabilities.push({
        id: `dom-xss-${Date.now()}-${Math.random()}`,
        name: 'Potential DOM XSS',
        severity: 'High',
        description: 'Dangerous DOM sink usage (innerHTML/document.write)',
        location: page.url,
        impact: 'Client-side code execution.',
        category: 'XSS'
      });
    }
  });

  // Info Disclosure
  if (response.headers['server']) {
    result.vulnerabilities.push({
      id: `info-${Date.now()}-${Math.random()}`,
      name: 'Server Header Disclosure',
      severity: 'Low',
      description: `Server header exposed: ${response.headers['server']}`,
      location: 'HTTP Headers',
      impact: 'Information leakage.',
      category: 'Information Disclosure'
    });
  }

  if (containsSQLError(html)) {
    result.vulnerabilities.push({
      id: `info-sqler-${Date.now()}-${Math.random()}`,
      name: 'Database Error Disclosure',
      severity: 'Medium',
      description: 'Database error messages exposed on page',
      location: page.url,
      impact: 'Information leakage.',
      category: 'Information Disclosure'
    });
  }

  return { success: true, data: result };
}

// Listen for messages (tasks)
if (parentPort) {
  parentPort.on('message', async (task) => {
    try {
      if (task.type === "init") {
        parentPort.postMessage({
          taskId: task.id,
          success: true,
          workerId: workerData.workerId
        });
        return;
      }

      if (!task || task.type !== 'scan' || !task.data || !task.data.url) {
        parentPort.postMessage({
          taskId: task?.id || `unknown-${Date.now()}`,
          success: false,
          error: 'invalid task: missing url',
          workerId: workerData.workerId
        });
        return;
      }

      const scanRes = await scanPage(task.data);

      if (!scanRes.success) {
        parentPort.postMessage({
          taskId: task.id,
          success: false,
          error: scanRes.error || 'scan failed',
          data: {
            vulnerabilities: scanRes.data?.vulnerabilities || [],
            formsFound: scanRes.data?.formsFound || 0,
            endpointsTested: scanRes.data?.endpointsTested || 0,
            pageUrl: task.data.url
          },
          workerId: workerData.workerId
        });
        return;
      }

      parentPort.postMessage({
        taskId: task.id,
        success: true,
        data: {
          vulnerabilities: scanRes.data.vulnerabilities || [],
          formsFound: scanRes.data.formsFound || 0,
          endpointsTested: scanRes.data.endpointsTested || 0,
          pageUrl: task.data.url
        },
        workerId: workerData.workerId
      });

    } catch (err) {
      console.error(`Worker ${workerData.workerId} error processing task:`, err);
      parentPort.postMessage({
        taskId: task?.id || `unknown-${Date.now()}`,
        success: false,
        error: err.message,
        workerId: workerData.workerId
      });
    }
  });
} else {
  console.error("Worker started without parentPort. This script must be run as a Worker.");
}
