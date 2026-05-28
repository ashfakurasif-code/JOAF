/**
 * health-worker.js — Web Worker for background health monitoring
 * Runs continuous health checks every 30 seconds
 * Reports back to main thread via postMessage
 */

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_TIMEOUT = 5000; // 5 second timeout per check

let SERVICES = [
  {
    id: 'appwrite_db',
    name: 'Appwrite Database',
    url: 'https://fra.cloud.appwrite.io/v1/health/db',
    headers: { 'X-Appwrite-Project': '6a11b6cd000b59f318eb' },
  },
  {
    id: 'appwrite_api',
    name: 'Appwrite API',
    url: 'https://fra.cloud.appwrite.io/v1/health',
    headers: {},
  },
];
let checkInterval = null;

/**
 * Initialize services from config
 */
function initializeServices(config) {
  if (config?.APPWRITE) {
    const { ENDPOINT, PROJECT_ID } = config.APPWRITE;
    SERVICES = [
      {
        id: 'appwrite_db',
        name: 'Appwrite Database',
        url: `${ENDPOINT}/health/db`,
        headers: { 'X-Appwrite-Project': PROJECT_ID },
      },
      {
        id: 'appwrite_api',
        name: 'Appwrite API',
        url: `${ENDPOINT}/health`,
        headers: {},
      },
    ];
  }
}

/**
 * Check a single service
 */
async function checkService(service) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);

    const response = await fetch(service.url, {
      method: 'GET',
      headers: service.headers || {},
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok) {
      const status = latency < 200 ? 'GREEN' : latency < 1000 ? 'YELLOW' : 'RED';
      return { status, latency, error: null };
    }

    return { status: 'RED', latency, error: `HTTP ${response.status}` };
  } catch (err) {
    const latency = Date.now() - start;
    return { status: 'RED', latency: null, error: err.message };
  }
}

/**
 * Run all health checks
 */
async function runHealthCheck() {
  const results = {};
  const startTime = Date.now();

  for (const service of SERVICES) {
    results[service.id] = await checkService(service);
  }

  const duration = Date.now() - startTime;

  postMessage({
    type: 'health_check',
    timestamp: new Date().toISOString(),
    results,
    duration,
  });
}

/**
 * Start background health monitoring
 */
function startMonitoring() {
  console.log('🏥 Health Worker started');
  runHealthCheck(); // Initial check immediately
  checkInterval = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL);
  
  postMessage({
    type: 'worker_ready',
    message: 'Health monitoring worker is ready',
  });
}

/**
 * Stop background health monitoring
 */
function stopMonitoring() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log('🏥 Health Worker stopped');
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  const { command, config } = event.data;

  switch (command) {
    case 'config':
      initializeServices(config);
      break;
    case 'start':
      startMonitoring();
      break;
    case 'stop':
      stopMonitoring();
      break;
    case 'check':
      runHealthCheck();
      break;
    default:
      console.warn('Unknown command:', command);
  }
});

// Start monitoring automatically
startMonitoring();
