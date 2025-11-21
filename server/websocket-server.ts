import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { WorkerPool } from './worker-pool';

export interface ScanProgress {
  scanId: string;
  status: 'crawling' | 'scanning' | 'completed' | 'error';
  progress: number;
  pagesScanned: number;
  totalPages: number;
  vulnerabilitiesFound: number;
  formsFound: number;
  endpointsTested: number;
  estimatedTimeRemaining: number;
  startTime: number;
  currentStage: string;
  vulnerabilities?: any[];
}

export class WebSocketServer {
  private io: SocketIOServer;
  private scanProgress: Map<string, ScanProgress> = new Map();
  private workerPool: WorkerPool | null = null;

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
  }

  setWorkerPool(workerPool: WorkerPool): void {
    this.workerPool = workerPool;
    this.setupWorkerPoolListeners();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join a scan room
      socket.on('join-scan', (scanId: string) => {
        socket.join(`scan-${scanId}`);
        console.log(`Client ${socket.id} joined scan room: ${scanId}`);

        // Send current progress if available
        const progress = this.scanProgress.get(scanId);
        if (progress) {
          socket.emit('scan-progress', progress);
        }
      });

      // Leave a scan room
      socket.on('leave-scan', (scanId: string) => {
        socket.leave(`scan-${scanId}`);
        console.log(`Client ${socket.id} left scan room: ${scanId}`);
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupWorkerPoolListeners(): void {
    if (!this.workerPool) return;

    this.workerPool.on('result', (result) => {
      // Update progress based on worker results
      // This will be called when individual page scans complete
    });

    this.workerPool.on('error', (error) => {
      console.error('Worker pool error:', error);
      // Broadcast error to all connected clients
      this.io.emit('scan-error', {
        message: 'Worker pool encountered an error',
        details: error
      });
    });
  }

  startScan(scanId: string, targetUrl: string, totalPages: number): void {
    const startTime = Date.now();

    const initialProgress: ScanProgress = {
      scanId,
      status: 'crawling',
      progress: 0,
      pagesScanned: 0,
      totalPages,
      vulnerabilitiesFound: 0,
      formsFound: 0,
      endpointsTested: 0,
      estimatedTimeRemaining: this.calculateEstimatedTime(0, totalPages, startTime),
      startTime,
      currentStage: 'Crawling website...'
    };

    this.scanProgress.set(scanId, initialProgress);
    this.broadcastProgress(scanId, initialProgress);
  }

  updateCrawlingProgress(scanId: string, pagesFound: number): void {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;

    progress.pagesScanned = pagesFound;
    progress.totalPages = Math.max(progress.totalPages, pagesFound);
    progress.progress = Math.round((pagesFound / Math.max(progress.totalPages, 1)) * 30); // Crawling is 30% of total progress
    progress.currentStage = `Found ${pagesFound} pages to scan...`;
    progress.estimatedTimeRemaining = this.calculateEstimatedTime(progress.progress, progress.totalPages, progress.startTime);

    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }

  updateScanningProgress(scanId: string, pagesScanned: number, vulnerabilitiesFound: number, formsFound: number, endpointsTested: number, vulnerabilities?: any[]): void {
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

    // Scanning is 70% of total progress
    const scanningProgress = (pagesScanned / Math.max(progress.totalPages, 1)) * 70;
    progress.progress = Math.round(30 + scanningProgress); // 30% from crawling + scanning progress
    progress.currentStage = `Scanning page ${pagesScanned} of ${progress.totalPages}...`;
    progress.estimatedTimeRemaining = this.calculateEstimatedTime(progress.progress, progress.totalPages, progress.startTime);
    progress.status = pagesScanned >= progress.totalPages ? 'completed' : 'scanning';

    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }

  completeScan(scanId: string, finalStats: any): void {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;

    progress.pagesScanned = finalStats.pagesScanned || progress.pagesScanned;
    progress.vulnerabilitiesFound = finalStats.vulnerabilities?.length || 0;
    progress.formsFound = finalStats.formsFound || 0;
    progress.endpointsTested = finalStats.endpointsTested || 0;
    progress.vulnerabilities = finalStats.vulnerabilities || [];
    progress.progress = 100;
    progress.estimatedTimeRemaining = 0;
    progress.status = 'completed';
    progress.currentStage = 'Scan completed!';

    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);
  }

  errorScan(scanId: string, error: string): void {
    const progress = this.scanProgress.get(scanId);
    if (!progress) return;

    progress.status = 'error';
    progress.currentStage = `Error: ${error}`;
    progress.estimatedTimeRemaining = 0;

    this.scanProgress.set(scanId, progress);
    this.broadcastProgress(scanId, progress);

    // Broadcast error to all clients
    this.io.to(`scan-${scanId}`).emit('scan-error', {
      message: error,
      scanId
    });
  }

  private calculateEstimatedTime(currentProgress: number, totalPages: number, startTime: number): number {
    if (currentProgress <= 0) return 0;

    const elapsed = Date.now() - startTime;
    const progressPerMs = currentProgress / elapsed;
    const remainingProgress = 100 - currentProgress;

    return Math.round(remainingProgress / progressPerMs / 1000); // Return in seconds
  }

  private broadcastProgress(scanId: string, progress: ScanProgress): void {
    this.io.to(`scan-${scanId}`).emit('scan-progress', progress);
  }

  getScanProgress(scanId: string): ScanProgress | undefined {
    return this.scanProgress.get(scanId);
  }

  cleanup(scanId: string): void {
    this.scanProgress.delete(scanId);
  }
}
