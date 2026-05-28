/**
 * queue-manager.js — Serverless rate-limit queue manager
 * Handles 429/503 responses with exponential backoff and pause/resume
 * Can be called as a wrapper for any API request
 */

const BASE_DELAY = 300;
const MAX_RETRY = 4;
const RATE_LIMIT_THRESHOLD = 0.8; // Pause at 80% capacity

class QueueTask {
  constructor(fn, maxRetries = MAX_RETRY) {
    this.fn = fn;
    this.maxRetries = maxRetries;
    this.attempts = 0;
    this.lastError = null;
    this.status = 'pending'; // pending, running, success, failed
  }

  async execute() {
    this.status = 'running';
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      this.attempts = attempt;
      try {
        const result = await this.fn();
        
        // Check for rate-limit headers
        const rateLimitRemaining = result.rateLimitRemaining !== undefined 
          ? result.rateLimitRemaining 
          : 1;
        const rateLimitTotal = result.rateLimitTotal || 1;
        const utilization = rateLimitTotal > 0 ? 1 - (rateLimitRemaining / rateLimitTotal) : 0;
        
        if (utilization > RATE_LIMIT_THRESHOLD) {
          // Pause queue if utilization exceeds 80% threshold
          throw new Error('RATE_LIMIT_APPROACHING');
        }

        this.status = 'success';
        return result;
      } catch (err) {
        this.lastError = err;
        const isRateLimitErr = err.message && (
          err.message.includes('429') ||
          err.message.includes('503') ||
          err.message.includes('RATE_LIMIT') ||
          err.message.includes('Too Many')
        );

        if (attempt === this.maxRetries || !isRateLimitErr) {
          this.status = 'failed';
          throw err;
        }

        // Exponential backoff with jitter
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}

class QueueManager {
  constructor() {
    this.queue = [];
    this.pausedAt = null;
    this.resumeTimer = null;
    this.isPaused = false;
    this.processing = false;
  }

  /**
   * Queue a task
   */
  async enqueue(fn, maxRetries = MAX_RETRY) {
    const task = new QueueTask(fn, maxRetries);
    this.queue.push(task);
    
    if (!this.processing && !this.isPaused) {
      await this.process();
    }
    
    return task;
  }

  /**
   * Process queue
   */
  async process() {
    if (this.processing || this.isPaused) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        try {
          await task.execute();
        } catch (err) {
          // Check if we should pause
          if (err.message.includes('429') || err.message.includes('RATE_LIMIT')) {
            this.pause();
            // Put task back in queue
            this.queue.unshift(task);
            break;
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Pause queue processing
   */
  pause(durationMs = 60000) {
    this.isPaused = true;
    this.pausedAt = Date.now();
    console.log(`⏸️ Queue paused for ${durationMs}ms`);

    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => this.resume(), durationMs);
  }

  /**
   * Resume queue processing
   */
  async resume() {
    this.isPaused = false;
    console.log('▶️ Queue resumed');
    await this.process();
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isPaused: this.isPaused,
      pausedAt: this.pausedAt,
      pendingTasks: this.queue.filter(t => t.status === 'pending').length,
      failedTasks: this.queue.filter(t => t.status === 'failed').length,
    };
  }
}

// Export singleton and task class
module.exports = {
  QueueManager,
  QueueTask,
  createQueueManager: () => new QueueManager(),
};
