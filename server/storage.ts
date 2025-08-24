import { type Scan, type InsertScan, type ChatMessage, type InsertChatMessage, type Vulnerability } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: string): Promise<Scan | undefined>;
  updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined>;
  getScans(): Promise<Scan[]>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined>;
  getChatMessages(): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private scans: Map<string, Scan>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.scans = new Map();
    this.chatMessages = new Map();
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = randomUUID();
    const scan: Scan = {
      ...insertScan,
      id,
      status: "pending",
      vulnerabilities: [],
      createdAt: new Date(),
      completedAt: null,
    };
    this.scans.set(id, scan);
    return scan;
  }

  async getScan(id: string): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (!scan) return undefined;
    
    const updatedScan = { ...scan, ...updates };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }

  async getScans(): Promise<Scan[]> {
    return Array.from(this.scans.values());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      response: null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const message = this.chatMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updates };
    this.chatMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values());
  }
}

export const storage = new MemStorage();
