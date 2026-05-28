/**
 * circuit-monitor.js — Metro-line style health dashboard controller
 * Renders service status as connected nodes with real-time updates
 */

class CircuitMonitor {
  constructor(containerId = 'circuit-container') {
    this.container = document.getElementById(containerId);
    this.lastResults = {};
    this.statusCache = {};
    this.animationFrame = null;

    if (!this.container) {
      console.warn(`Circuit monitor container '${containerId}' not found`);
      return;
    }

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.render();
    console.log('🚉 Circuit Monitor initialized');
  }

  setupEventListeners() {
    // Listen for health updates from BroadcastChannel
    window.addEventListener('joaf_health_updated', (e) => {
      this.handleHealthUpdate(e.detail);
    });

    // Listen for manual health check requests
    document.addEventListener('request-health-check', () => {
      if (window.healthService) {
        window.healthService.runHealthCheck();
      }
    });
  }

  handleHealthUpdate(detail) {
    this.lastResults = detail.results;
    this.render();
  }

  /**
   * Render Metro-line circuit diagram
   * Layout: horizontal line with nodes for each service
   */
  render() {
    if (!this.container) return;

    const status = window.healthService?.getStatus() || {};
    const results = status.results || this.lastResults;
    const services = status.services || {};

    const html = `
      <div class="circuit-monitor">
        <div class="circuit-header">
          <h2>🚉 JOAF Metro-Line Health Circuit</h2>
          <div class="circuit-controls">
            <button class="btn-refresh" onclick="document.dispatchEvent(new CustomEvent('request-health-check'))">
              🔄 Refresh
            </button>
            <span class="last-check" id="last-check-time">Never</span>
          </div>
        </div>
        
        <div class="circuit-line">
          ${this.renderServiceNodes(services, results)}
        </div>
        
        <div class="circuit-legend">
          <div class="legend-item"><span class="status-dot green"></span>Healthy (&lt;200ms)</div>
          <div class="legend-item"><span class="status-dot yellow"></span>Slow (200-1000ms)</div>
          <div class="legend-item"><span class="status-dot red"></span>Offline</div>
          <div class="legend-item"><span class="status-dot gray"></span>Not Checked</div>
        </div>

        <div class="circuit-details" id="circuit-details"></div>
      </div>
    `;

    this.container.innerHTML = html;
    this.updateLastCheckTime();
    this.attachNodeClickHandlers();
  }

  /**
   * Render service nodes along the metro line
   */
  renderServiceNodes(services, results) {
    const serviceEntries = Object.entries(services);
    const nodeHTML = serviceEntries
      .map(([key, service], idx) => {
        const result = results[key] || { status: 'GRAY' };
        const statusClass = this.getStatusClass(result.status);
        const latency = result.latency ? `${result.latency}ms` : '—';
        const isCritical = service.critical ? 'critical' : '';

        return `
          <div class="circuit-node ${statusClass} ${isCritical}" 
               data-service-key="${key}"
               data-service-name="${service.name}"
               title="${service.name}: ${result.status}">
            <div class="node-icon">${service.icon}</div>
            <div class="node-label">${service.name}</div>
            <div class="node-latency">${latency}</div>
            <div class="node-status-pulse"></div>
          </div>
        `;
      })
      .join('');

    return `
      <svg class="circuit-svg" viewBox="0 0 ${serviceEntries.length * 150} 300">
        <defs>
          <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#8BC34A;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#4CAF50;stop-opacity:0" />
          </linearGradient>
        </defs>
        <!-- Metro line -->
        <line x1="50" y1="150" x2="${serviceEntries.length * 150 - 50}" y2="150" 
              stroke="#333" stroke-width="3" />
        <!-- Connection lines from nodes to metro line -->
        ${serviceEntries
          .map(
            (_, idx) =>
              `<line x1="${75 + idx * 150}" y1="50" x2="${75 + idx * 150}" y2="150" stroke="#999" stroke-width="1" opacity="0.5" />`
          )
          .join('')}
      </svg>
      <div class="nodes-container">
        ${nodeHTML}
      </div>
    `;
  }

  /**
   * Get CSS class for status
   */
  getStatusClass(status) {
    switch (status) {
      case 'GREEN':
        return 'status-green';
      case 'YELLOW':
        return 'status-yellow';
      case 'RED':
        return 'status-red';
      default:
        return 'status-gray';
    }
  }

  /**
   * Attach click handlers to service nodes
   */
  attachNodeClickHandlers() {
    document.querySelectorAll('.circuit-node').forEach((node) => {
      node.addEventListener('click', (e) => {
        const serviceKey = node.dataset.serviceKey;
        const serviceName = node.dataset.serviceName;
        this.showNodeDetails(serviceKey, serviceName);
      });
    });
  }

  /**
   * Show diagnostic modal for a service
   */
  showNodeDetails(serviceKey, serviceName) {
    const result = this.lastResults[serviceKey] || {};
    const status = result.status || 'UNKNOWN';
    const latency = result.latency ? `${result.latency}ms` : 'N/A';
    const error = result.error || 'No errors';
    const timestamp = result.timestamp || 'Unknown';

    const modal = `
      <div class="circuit-modal-overlay" onclick="this.remove()">
        <div class="circuit-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${serviceName}</h3>
            <button onclick="this.closest('.circuit-modal-overlay').remove()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="diagnostic-row">
              <label>Status:</label>
              <span class="status-badge status-${status.toLowerCase()}">${status}</span>
            </div>
            
            <div class="diagnostic-row">
              <label>Latency:</label>
              <span>${latency}</span>
            </div>
            
            <div class="diagnostic-row">
              <label>Last Check:</label>
              <span>${timestamp}</span>
            </div>
            
            <div class="diagnostic-row">
              <label>Error:</label>
              <span class="error-message">${error}</span>
            </div>
            
            <div class="diagnostic-row">
              <label>Service ID:</label>
              <span>${serviceKey}</span>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-retry" onclick="document.dispatchEvent(new CustomEvent('request-health-check')); this.closest('.circuit-modal-overlay').remove()">
              🔄 Retry Check
            </button>
            <button class="btn-close" onclick="this.closest('.circuit-modal-overlay').remove()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  }

  /**
   * Update the "last check" timestamp
   */
  updateLastCheckTime() {
    const timeEl = document.getElementById('last-check-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `Last checked: ${now.toLocaleTimeString()}`;
    }
  }

  /**
   * Start monitoring
   */
  start() {
    if (window.healthService) {
      window.healthService.start();
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (window.healthService) {
      window.healthService.stop();
    }
  }
}

// Create and export singleton
const circuitMonitor = new CircuitMonitor('circuit-container');
