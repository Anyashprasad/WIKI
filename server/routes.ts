import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScanSchema, insertChatMessageSchema, type Vulnerability } from "@shared/schema";
import { z } from "zod";

// Mock vulnerability scanning function
async function performVulnerabilityScan(url: string): Promise<Vulnerability[]> {
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Generate mock vulnerabilities based on URL
  const vulnerabilities: Vulnerability[] = [
    {
      id: "1",
      name: "SQL Injection",
      severity: "Critical",
      description: "SQL injection vulnerability detected in login form. User input is directly concatenated into SQL queries without proper sanitization.",
      location: "/login.php?username=admin&password=test",
      impact: "Attackers could potentially access, modify, or delete database contents, including sensitive user information.",
      category: "SQL Injection"
    },
    {
      id: "2",
      name: "Cross-Site Scripting (XSS)",
      severity: "High",
      description: "Reflected XSS vulnerability found in search functionality. User input is reflected in the response without proper encoding.",
      location: "/search.php?q=<script>alert('xss')</script>",
      impact: "Malicious scripts could be executed in users' browsers, potentially stealing session tokens or performing actions on behalf of users.",
      category: "XSS"
    },
    {
      id: "3",
      name: "Cross-Site Request Forgery (CSRF)",
      severity: "Medium",
      description: "CSRF protection missing on sensitive forms. State-changing operations can be performed without proper token validation.",
      location: "/account/settings",
      impact: "Attackers could trick users into performing unintended actions like changing account settings or making transactions.",
      category: "CSRF"
    }
  ];
  
  return vulnerabilities;
}

// Mock Ollama API call
async function callOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3",
        prompt: prompt,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response || "I apologize, but I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Ollama API error:", error);
    return "I'm currently unable to connect to the AI service. Please try again later.";
  }
}

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
          const vulnerabilities = await performVulnerabilityScan(scan.url);
          await storage.updateScan(scan.id, { 
            status: "completed", 
            vulnerabilities,
            completedAt: new Date()
          });
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
    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }
    
    const format = req.query.format as string;
    if (format === "json") {
      res.setHeader('Content-Disposition', `attachment; filename="scan-${scan.id}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(scan);
    } else {
      res.status(400).json({ message: "Unsupported export format" });
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
