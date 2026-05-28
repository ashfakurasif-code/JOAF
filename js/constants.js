/**
 * constants.js — Centralized configuration for Appwrite and services
 * Used across all modules to maintain consistency
 */

const JOAF_CONFIG = {
  // Appwrite Configuration
  APPWRITE: {
    ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
    PROJECT_ID: '6a11b6cd000b59f318eb',
    DB_ID: 'joaf',
    KEY: () => localStorage.getItem('aw_api_key'),
  },

  // Service Health Check Configuration
  HEALTH: {
    INTERVAL: 30000, // 30 seconds
    TIMEOUT: 5000, // 5 second timeout per check
    LATENCY_GREEN: 200, // < 200ms
    LATENCY_YELLOW: 1000, // < 1000ms
  },

  // Rate Limiting Configuration
  RATE_LIMIT: {
    BASE_DELAY: 300, // ms
    MAX_RETRIES: 4,
    THRESHOLD: 0.8, // 80% capacity
  },

  // Offline Sync Configuration
  OFFLINE_SYNC: {
    DB_NAME: 'joaf_offline',
    DB_VERSION: 1,
    AUTO_SYNC_DELAY: 60000, // 60 seconds after going back online
  },
};

// Export for use in modules
// Export to window for browser environments
if (typeof window !== 'undefined') {
  window.JOAF_CONFIG = JOAF_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JOAF_CONFIG;
}
