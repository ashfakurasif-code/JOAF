/**
 * health-service.js — Health monitoring for all critical services
 * Reports: latency, availability, error status via BroadcastChannel
 */

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_TIMEOUT = 5000; // 5 second timeout per check
const LATENCY_THRESHOLDS = {
  GREEN: 200,   // < 200ms is green
  YELLOW: 1000, // < 1000ms is yellow
  RED: null,    // >= 1000ms is red
};

class HealthService {
  constructor() {
    this.services = {};
    this.broadcastChannel = null;
    this.checkInterval = null;
    this.lastResults = {};

    try {
      this.broadcastChannel = new BroadcastChannel('joaf_health_monitor');
      this.broadcastChannel.onmessage = (e) => this.handleHealthMessage(e);
    } catch (err) {
      console.warn('BroadcastChannel not available:', err.message);
    }

    this.initializeServices();
  }

  initializeServices() {
    this.services = {
      appwrite_db: {
        name: 'Appwrite Database',
        icon: '🗄️',
        check: () => this.checkAppwriteDB(),
        critical: true,
      },
      appwrite_api: {
        name: 'Appwrite API',
        icon: '⚙️',
        check: () => this.checkAppwriteAPI(),
        critical: true,
      },
      push_service: {
        name: 'Push Notifications',
        icon: '🔔',
        check: () => this.checkPushService(),
        critical: false,
      },
      ai_openrouter: {
        name: 'AI (OpenRouter)',
        icon: '🧠',
        check: () => this.checkAI('openrouter'),
        critical: false,
      },
      ai_gemini: {
        name: 'AI (Gemini)',
        icon: '🔵',
        check: () => this.checkAI('gemini'),
        critical: false,
      },
      ai_groq: {
        name: 'AI (Groq)',
        icon: '⚡',
        check: () => this.checkAI('groq'),
        critical: false,
      },
      facebook_api: {
        name: 'Facebook API',
        icon: 'f',
        check: () => this.checkFacebookAPI(),
        critical: false,
      },
    };
  }

  /**
   * Start continuous health monitoring
   */
  start() {
    if (this.checkInterval) return;
    console.log('🏥 Health Service started');
    this.runHealthCheck(); // Initial check immediately
    this.checkInterval = setInterval(() => this.runHealthCheck(), HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🏥 Health Service stopped');
    }
  }

  /**
   * Run all health checks and broadcast results
   */
  async runHealthCheck() {
    const results = {};
    const startTime = Date.now();

    for (const [key, service] of Object.entries(this.services)) {
      try {
        const result = await this.withTimeout(service.check(), HEALTH_TIMEOUT);
        results[key] = result;
      } catch (err) {
        results[key] = {
          status: 'RED',
          latency: null,
          error: err.message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    this.lastResults = results;
    this.broadcastResults(results);
    const duration = Date.now() - startTime;
    console.log(`🏥 Health check completed in ${duration}ms`);
  }

  /**
   * Wrap a promise with timeout
   */
  withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);
  }

  /**
   * Check Appwrite Database connectivity
   */
  async checkAppwriteDB() {
    const start = Date.now();
    try {
      if (!window.JOAF_CONFIG?.APPWRITE) {
        throw new Error('JOAF_CONFIG not initialized. Ensure constants.js is loaded before health-service.js');
      }
      const config = window.JOAF_CONFIG.APPWRITE;
      
      const response = await fetch(
        `${config.ENDPOINT}/health/db`,
        {
          method: 'GET',
          headers: {
            'X-Appwrite-Project': config.PROJECT_ID,
          },
        }
      );
      const latency = Date.now() - start;
      if (response.ok) {
        return {
          status: this.getStatusByLatency(latency),
          latency,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      return {
        status: 'RED',
        latency: null,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Appwrite API connectivity
   */
  async checkAppwriteAPI() {
    const start = Date.now();
    try {
      if (!window.JOAF_CONFIG?.APPWRITE) {
        throw new Error('JOAF_CONFIG not initialized. Ensure constants.js is loaded before health-service.js');
      }
      const config = window.JOAF_CONFIG.APPWRITE;
      
      const response = await fetch(`${config.ENDPOINT}/health`, {
        method: 'GET',
      });
      const latency = Date.now() - start;
      if (response.ok) {
        return {
          status: this.getStatusByLatency(latency),
          latency,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      return {
        status: 'RED',
        latency: null,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Push Notification Service
   */
  async checkPushService() {
    const start = Date.now();
    try {
      if (!window.JOAF_CONFIG?.APPWRITE) {
        throw new Error('JOAF_CONFIG not initialized. Ensure constants.js is loaded before health-service.js');
      }
      const config = window.JOAF_CONFIG.APPWRITE;
      
      const response = await fetch(
        `${config.ENDPOINT}/databases/${config.DB_ID}/collections/push_subscriptions`,
        {
          method: 'GET',
          headers: {
            'X-Appwrite-Project': config.PROJECT_ID,
            'X-Appwrite-Key': localStorage.getItem('aw_api_key') || 'missing',
          },
        }
      );
      const latency = Date.now() - start;
      if (response.ok || response.status === 401) {
        // 401 is OK — shows API is up, just not authenticated
        return {
          status: this.getStatusByLatency(latency),
          latency,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      return {
        status: 'RED',
        latency: null,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check AI Service availability
   */
  async checkAI(provider) {
    const start = Date.now();
    try {
      const response = await fetch('/.netlify/functions/groq-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'health-check',
          provider,
        }),
      });
      const latency = Date.now() - start;
      if (response.ok) {
        return {
          status: this.getStatusByLatency(latency),
          latency,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      return {
        status: 'RED',
        latency: null,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Facebook API connectivity
   */
  async checkFacebookAPI() {
    const start = Date.now();
    try {
      const response = await fetch('/.netlify/functions/fb-config', {
        method: 'GET',
      });
      const latency = Date.now() - start;
      if (response.ok) {
        return {
          status: this.getStatusByLatency(latency),
          latency,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      return {
        status: 'RED',
        latency: null,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine status color based on latency
   */
  getStatusByLatency(latency) {
    if (latency < LATENCY_THRESHOLDS.GREEN) return 'GREEN';
    if (latency < LATENCY_THRESHOLDS.YELLOW) return 'YELLOW';
    return 'RED';
  }

  /**
   * Broadcast health results via BroadcastChannel
   */
  broadcastResults(results) {
    if (!this.broadcastChannel) return;
    try {
      this.broadcastChannel.postMessage({
        type: 'joaf_health_results',
        timestamp: new Date().toISOString(),
        results,
        services: this.services,
      });
    } catch (err) {
      console.error('Failed to broadcast health results:', err);
    }
  }

  /**
   * Handle incoming health messages from other tabs
   */
  handleHealthMessage(event) {
    const { data } = event;
    if (data.type === 'joaf_health_results') {
      this.lastResults = data.results;
      window.dispatchEvent(
        new CustomEvent('joaf_health_updated', { detail: data })
      );
    }
  }

  /**
   * Get current health status (from last check)
   */
  getStatus() {
    return {
      timestamp: new Date().toISOString(),
      results: this.lastResults,
      services: this.services,
    };
  }

  /**
   * Get critical services status
   */
  getCriticalStatus() {
    const critical = Object.entries(this.services)
      .filter(([, s]) => s.critical)
      .reduce((acc, [key, service]) => {
        acc[key] = {
          ...this.lastResults[key],
          name: service.name,
        };
        return acc;
      }, {});
    return critical;
  }

  /**
   * Check if all critical services are healthy
   */
  isCriticallyHealthy() {
    return Object.entries(this.services)
      .filter(([, s]) => s.critical)
      .every(([key]) => this.lastResults[key]?.status === 'GREEN');
  }
}

// Export singleton instance
const healthService = new HealthService();
window.healthService = healthService;
