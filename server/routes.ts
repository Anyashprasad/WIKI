import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScanSchema, insertChatMessageSchema, type Vulnerability } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { VulnerabilityScanner } from "./vulnerability-scanner";
import { WebSocketServer } from "./websocket-server";

// Real vulnerability scanning function with WebSocket support
/**
 * Performs a comprehensive vulnerability scan on a target URL.
 * This function orchestrates the scanning process, including crawling and vulnerability detection.
 * 
 * @param url - The target URL to scan.
 * @param scanId - The unique ID of the scan session.
 * @param wsServer - Optional WebSocket server instance for real-time updates.
 * @returns A promise that resolves to the scan results including vulnerabilities and stats.
 */
async function performVulnerabilityScan(url: string, scanId: string, wsServer?: WebSocketServer): Promise<{
  vulnerabilities: Vulnerability[];
  pagesScanned: number;
  crawlStats: object;
}> {
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
    console.error('Vulnerability scan failed:', error);

    if (wsServer) {
      wsServer.errorScan(scanId, `Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Return a default vulnerability indicating the scan failed
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

// Mock Ollama API call with professional fallback
/**
 * Mock function to simulate AI-powered security advice.
 * In a production environment, this would connect to an LLM API (e.g., OpenAI, Anthropic).
 * Currently returns static, professional advice to ensure reliability for the portfolio showcase.
 * 
 * @param prompt - The prompt containing the vulnerability details.
 * @returns A promise that resolves to the generated advice string.
 */
async function callOllama(prompt: string): Promise<string> {
  // Since we don't have the compute resources for a real LLM, we'll return professional static responses
  // based on the prompt context. This ensures the portfolio project looks polished.

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

/**
 * Registers all API routes for the application.
 * Handles scan creation, retrieval, export, and chat functionality.
 * 
 * @param app - The Express application instance.
 * @returns A promise that resolves to the HTTP server instance.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new scan
  app.post("/api/scans", async (req, res) => {
    try {
      const validatedData = insertScanSchema.parse(req.body);
      const scan = await storage.createScan(validatedData);

      // Start vulnerability scan in background
      setTimeout(async () => {
        try {
          await storage.updateScan(scan.id, { status: "scanning" });
          const wsServer = (global as any).wsServer;
          const scanResult = await performVulnerabilityScan(scan.url, scan.id, wsServer);
          await storage.updateScan(scan.id, {
            status: "completed",
            vulnerabilities: scanResult.vulnerabilities,
            pagesScanned: scanResult.pagesScanned,
            crawlStats: scanResult.crawlStats,
            completedAt: new Date()
          });

          if (wsServer) {
            wsServer.completeScan(scan.id, {
              pagesScanned: scanResult.pagesScanned,
              vulnerabilities: scanResult.vulnerabilities,
              formsFound: (scanResult as any).formsFound || 0, // Ensure these properties exist or are passed
              endpointsTested: (scanResult as any).endpointsTested || 0
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

  // Get scan by ID
  app.get("/api/scans/:id", async (req, res) => {
    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }
    res.json(scan);
  });

  // Get all scans
  app.get("/api/scans", async (req, res) => {
    const scans = await storage.getScans();
    res.json(scans);
  });

  // Export scan results
  app.get("/api/scans/:id/export", async (req, res) => {
    const { id } = req.params;
    const { format } = req.query;

    try {
      const scan = await storage.getScan(id);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      if (format === "json") {
        res.setHeader('Content-Disposition', `attachment; filename="scan-${id}.json"`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(scan);
      }

      if (format === "pdf") {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
        });

        res.setHeader('Content-Disposition', `attachment; filename="scan-${id}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        // Header with "Logo"
        // Drawing the WIKI logo text manually to look like the SVG
        // Header with "Logo"
        // Drawing the WIKI logo text manually to look like the SVG
        doc.fontSize(60)
          .font('Helvetica-Bold')
          .fillColor('#10b981') // Green color for the logo
          .text('WIKI', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(24)
          .font('Helvetica')
          .fillColor('#000000') // Black color for the title
          .text('Security Vulnerability Scan Report', { align: 'center' });

        doc.moveDown(2);

        doc.moveDown(2);

        // Scan Information
        doc.fontSize(12)
          .fillColor('#000000')
          .text('Scan Information', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(10)
          .text(`Target URL: ${scan.url}`, { continued: false });
        doc.text(`Scan Date: ${new Date(scan.createdAt || Date.now()).toLocaleString()}`);
        doc.text(`Status: ${scan.status}`);
        doc.text(`Pages Scanned: ${scan.pagesScanned || 0}`);

        doc.moveDown(2);

        // Summary
        const vulnerabilities = Array.isArray(scan.vulnerabilities) ? scan.vulnerabilities : [];
        const severityCounts = {
          Critical: vulnerabilities.filter((v: any) => v.severity === 'Critical').length,
          High: vulnerabilities.filter((v: any) => v.severity === 'High').length,
          Medium: vulnerabilities.filter((v: any) => v.severity === 'Medium').length,
          Low: vulnerabilities.filter((v: any) => v.severity === 'Low').length
        };

        doc.fontSize(12)
          .fillColor('#000000')
          .text('Vulnerability Summary', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(10);
        doc.fillColor('#dc2626').text(`Critical: ${severityCounts.Critical}`);
        doc.fillColor('#ea580c').text(`High: ${severityCounts.High}`);
        doc.fillColor('#ca8a04').text(`Medium: ${severityCounts.Medium}`);
        doc.fillColor('#16a34a').text(`Low: ${severityCounts.Low}`);

        doc.moveDown(2);

        // Vulnerabilities Detail
        if (vulnerabilities.length > 0) {
          doc.fontSize(12)
            .fillColor('#000000')
            .text('Detected Vulnerabilities', { underline: true });
          doc.moveDown();

          vulnerabilities.forEach((vuln: any, index: number) => {
            // Check if we need a new page
            if (doc.y > 700) {
              doc.addPage();
            }

            // Vulnerability number and name
            doc.fontSize(11)
              .fillColor('#000000')
              .text(`${index + 1}. ${vuln.name}`, { underline: true });

            doc.moveDown(0.3);

            // Severity with color
            const severityColor = vuln.severity === 'Critical' ? '#dc2626' :
              vuln.severity === 'High' ? '#ea580c' :
                vuln.severity === 'Medium' ? '#ca8a04' : '#16a34a';

            doc.fontSize(9)
              .fillColor(severityColor)
              .text(`Severity: ${vuln.severity}`, { continued: true })
              .fillColor('#000000')
              .text(`  |  Category: ${vuln.category || 'Unknown'}`);

            doc.moveDown(0.3);

            // Location
            doc.fontSize(9)
              .fillColor('#666666')
              .text(`Location: ${vuln.location}`);

            doc.moveDown(0.5);

            // Description
            doc.fontSize(9)
              .fillColor('#000000')
              .text('Description:', { underline: true });
            doc.fontSize(9)
              .fillColor('#333333')
              .text(vuln.description, {
                width: 500,
                align: 'left'
              });

            doc.moveDown(0.5);

            // Impact
            doc.fontSize(9)
              .fillColor('#000000')
              .text('Impact:', { underline: true });
            doc.fontSize(9)
              .fillColor('#333333')
              .text(vuln.impact, {
                width: 500,
                align: 'left'
              });

            doc.moveDown(1.5);
          });
        } else {
          doc.fontSize(10)
            .fillColor('#16a34a')
            .text('No vulnerabilities detected. The target appears to be secure.');
        }

        // Footer
        doc.fontSize(8)
          .fillColor('#999999')
          .text(
            `Report generated on ${new Date().toLocaleString()}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );

        doc.end();
        return;
      }

      if (format === "excel") {
        // Excel export implementation
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'WIKI Security Scanner';

        const worksheet = workbook.addWorksheet('Vulnerabilities');
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Severity', key: 'severity', width: 15 },
          { header: 'Location', key: 'location', width: 30 },
          { header: 'Description', key: 'description', width: 50 },
          { header: 'Impact', key: 'impact', width: 40 }
        ];

        const vulnerabilities = Array.isArray(scan.vulnerabilities) ? scan.vulnerabilities : [];
        vulnerabilities.forEach((vuln: any) => {
          worksheet.addRow(vuln);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="scan-${id}.xlsx"`);

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

  // Security chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const chatMessage = await storage.createChatMessage(validatedData);

      // Generate response using Ollama
      const securityPrompt = `You are a cybersecurity expert. Answer the following security question with practical, actionable advice: ${validatedData.message}`;
      const response = await callOllama(securityPrompt);

      const updatedMessage = await storage.updateChatMessage(chatMessage.id, { response });
      res.json(updatedMessage);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat message", error });
    }
  });

  // Generate vulnerability fix
  app.post("/api/vulnerabilities/:id/fix", async (req, res) => {
    const { vulnerability } = req.body;
    if (!vulnerability) {
      return res.status(400).json({ message: "Vulnerability data required" });
    }

    const fixPrompt = `Generate a detailed fix for this ${vulnerability.category} vulnerability: ${vulnerability.description}. Provide specific code examples and best practices.`;
    const fix = await callOllama(fixPrompt);

    res.json({ fix });
  });

  const httpServer = createServer(app);
  return httpServer;
}
