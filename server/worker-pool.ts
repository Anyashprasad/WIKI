import { Worker } from 'worker_threads';
import path from 'path';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { CrawledPage } from './web-crawler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Task {
  id: string;
  type: 'scan' | 'init';
  data: any;
  priority?: number;
  resolve?: (value: WorkerResult) => void;
  reject?: (reason?: any) => void;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  workerId: number;
  __internal_log?: any;
}

export interface WorkerPoolOptions {
  workerCount?: number;
  rateLimitDelay?: number;
  maxConcurrentRequests?: number;
}

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private activeTasks = new Map<string, { task: Task; workerId: number }>();
  private scanStates = new Map<string, any>();

  private workerCount: number;
  private rateLimitDelay: number;
  private maxConcurrentRequests: number;

  private requestCount = 0;
  private lastRequestTime = 0;
  private nextTaskId = 0;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(options: WorkerPoolOptions = {}) {
    super();
    this.workerCount = options.workerCount ?? 5;
    this.rateLimitDelay = options.rateLimitDelay ?? 500; // Reduced default delay
    this.maxConcurrentRequests = options.maxConcurrentRequests ?? 10;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Resolve worker path relative to this file
    const workerPath = path.resolve(__dirname, 'scan-worker.cjs');

    for (let i = 0; i < this.workerCount; i++) {
      this.createWorker(i, workerPath);
    }
  }

  private createWorker(index: number, workerPath: string) {
    if (this.isShuttingDown) return;

    try {
      const worker = new Worker(workerPath, {
        workerData: { workerId: index }
        // Removed execArgv as it can cause issues with .cjs files in some environments
      });

      worker.on('message', (msg: WorkerResult) => {
        // allow worker internal logs to surface
        if (msg && (msg as any).__internal_log) {
          console.log(`WORKER[${index}] internal:`, ...(msg as any).__internal_log.payload || []);
          return;
        }
        this.handleWorkerResult(msg);
      });

      worker.on('error', (err) => {
        console.error(`Worker ${index} error event:`, err);
        this.emit('error', { workerId: index, error: err });
      });

      worker.on('exit', (code) => {
        if (this.isShuttingDown) return;

        if (code !== 0) {
          console.warn(`Worker ${index} exited with code: ${code}`);
          this.emit('workerExit', { workerId: index, code });

          // Clean up any active task for this worker
          const workerKey = `worker-${index}`;
          const active = this.activeTasks.get(workerKey);
          if (active) {
            const { resolve, reject, id } = active.task;
            reject?.(new Error(`Worker ${index} exited unexpectedly with code ${code}`));
            this.activeTasks.delete(workerKey);

            // Re-queue task if appropriate, or just fail it. 
            // For now, we fail it to avoid infinite loops of death.
          }

          // Replace the dead worker
          console.log(`Restarting worker ${index}...`);
          this.workers[index] = null as any; // clear old ref
          this.createWorker(index, workerPath);
        }
      });

      // Store worker
      if (this.workers[index]) {
        this.workers[index] = worker;
      } else {
        this.workers.push(worker);
      }

    } catch (e) {
      console.error(`Failed to create worker ${index}:`, e);
    }
  }

  addTask(task: Task): Promise<WorkerResult> {
    if (this.isShuttingDown) {
      return Promise.reject(new Error('Worker pool is shutting down'));
    }
    const taskId = task.id || `task-${this.nextTaskId++}`;
    const wrapped: Task = { ...task, id: taskId };
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ ...wrapped, resolve, reject });
      // Sort by priority if needed (higher priority first)
      if (task.priority) {
        this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      }
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.isShuttingDown) return;
    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0) {
        if (this.isShuttingDown) break;

        const now = Date.now();
        const sinceLast = now - this.lastRequestTime;

        // Rate limiting check
        if (this.requestCount >= this.maxConcurrentRequests) {
          break; // Wait for slots to free up
        }

        if (this.requestCount > 0 && sinceLast < this.rateLimitDelay) {
          // Wait for rate limit
          await new Promise(r => setTimeout(r, Math.max(this.rateLimitDelay - sinceLast, 50)));
          continue; // Retry loop
        }

        // Find a free worker
        const freeIndex = this.workers.findIndex((w, idx) => w && !this.activeTasks.has(`worker-${idx}`));

        if (freeIndex === -1) {
          break; // No free workers
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
          // Fail the task immediately
          reject?.(err);
          this.activeTasks.delete(workerKey);
          this.requestCount--;
        }
      }
    } finally {
      this.isProcessing = false;

      // If there are still tasks and we broke out early, try again soon
      if (this.taskQueue.length > 0 && !this.isShuttingDown) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private handleWorkerResult(result: WorkerResult) {
    const { taskId, success, data, error, workerId } = result;

    // Decrement request count safely
    this.requestCount = Math.max(0, this.requestCount - 1);
    this.lastRequestTime = Date.now();

    const workerKey = `worker-${workerId}`;
    const entry = this.activeTasks.get(workerKey);

    if (entry && entry.task.id === taskId) {
      const { resolve, reject } = entry.task;
      if (success) resolve?.(result);
      else reject?.(new Error(error || 'Worker returned failure'));

      // Clear active task
      this.activeTasks.delete(workerKey);
    }

    // Always emit result for monitoring
    this.emit('result', result);

    // Update scan stats if this was a scan task
    if (taskId && taskId.includes('::')) {
      this.updateScanStats(taskId, data);
    }

    // Continue processing queue immediately
    this.processQueue();
  }

  private updateScanStats(taskId: string, data: any) {
    const scanId = taskId.split('::')[0];
    const state = this.scanStates.get(scanId);

    if (state) {
      state.pagesScanned = Math.min(state.pagesScanned + 1, state.totalPages);

      if (data) {
        state.vulnerabilitiesFound += (Array.isArray(data.vulnerabilities) ? data.vulnerabilities.length : 0);
        state.formsFound += (typeof data.formsFound === 'number' ? data.formsFound : 0);
        state.endpointsTested += (typeof data.endpointsTested === 'number' ? data.endpointsTested : 0);
      }

      const progress = state.totalPages > 0 ? Math.round((state.pagesScanned / state.totalPages) * 100) : 0;

      this.emit('progress', {
        scanId,
        status: state.pagesScanned >= state.totalPages ? 'completed' : 'running',
        progress,
        pagesScanned: state.pagesScanned,
        totalPages: state.totalPages,
        vulnerabilitiesFound: state.vulnerabilitiesFound,
        formsFound: state.formsFound,
        endpointsTested: state.endpointsTested
      });

      if (state.pagesScanned >= state.totalPages) {
        state.status = 'completed';
        this.scanStates.delete(scanId);
      }
    }
  }

  async scanPages(scanId: string, pages: CrawledPage[]) {
    if (this.isShuttingDown) return [];

    const state = {
      scanId,
      totalPages: pages.length,
      pagesScanned: 0,
      vulnerabilitiesFound: 0,
      formsFound: 0,
      endpointsTested: 0,
      startTime: Date.now(),
      status: 'running'
    };
    this.scanStates.set(scanId, state);

    // Enqueue all tasks
    const promises = pages.map((p, idx) =>
      this.addTask({
        id: `${scanId}::page-${idx}`,
        type: 'scan',
        data: p,
        priority: 1
      })
    );

    const settled = await Promise.allSettled(promises);
    const ok = settled
      .filter(s => s.status === 'fulfilled')
      .map((s: any) => s.value as WorkerResult);

    // Ensure final completion event is sent
    this.emit('progress', {
      scanId,
      status: 'completed',
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
    // Wait for active tasks to drain (optional, or just kill)
    while (this.activeTasks.size > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
    await Promise.all(this.workers.map(w => w ? w.terminate() : Promise.resolve()));
    this.workers = [];
  }
}
