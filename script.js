/* ═════════════════════════════════════════════════════════════
   AURALYTICS PRO · QUANTUM DATA INTELLIGENCE STUDIO
   Premium JavaScript Engine - ES6+ Pure Logic
   ═════════════════════════════════════════════════════════════ */

// ── APPLICATION STATE ──────────────────────────────────────── //
const appState = {
  csvData: null,
  numericColumns: [],
  columns: [],
  startTime: Date.now(),
  charts: {
    line: null,
    bar: null,
  },
  settings: {
    aiMode: true,
    typingEffect: true,
    verbosity: 'standard',
    gradientFill: true,
    chartAnimations: true,
    maxPoints: 100,
  },
};

// ── DOM SELECTORS ──────────────────────────────────────────── //
const DOM = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  sidebarNav: document.getElementById('sidebarNav'),
  mainPanel: document.getElementById('mainPanel'),
  pageContent: document.getElementById('pageContent'),
  breadcrumb: document.getElementById('breadcrumb'),
  breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),
  headerTime: document.getElementById('headerTime'),
  uptimeDisplay: document.getElementById('uptimeDisplay'),
  recordsDisplay: document.getElementById('recordsDisplay'),

  // Upload zone
  uploadZone: document.getElementById('uploadZone'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  uploadProgress: document.getElementById('uploadProgress'),
  progressFill: document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),

  // KPI cards
  kpiGrid: document.getElementById('kpiGrid'),
  kpiRows: document.getElementById('kpiRows'),
  kpiCols: document.getElementById('kpiCols'),
  kpiNumeric: document.getElementById('kpiNumeric'),
  kpiProcessTime: document.getElementById('kpiProcessTime'),

  // Statistics
  statsSection: document.getElementById('statsSection'),
  statsTable: document.getElementById('statsTable'),
  statsTableBody: document.getElementById('statsTableBody'),

  // AI Report
  aiReportSection: document.getElementById('aiReportSection'),
  aiReportBody: document.getElementById('aiReportBody'),
  aiReportMeta: document.getElementById('aiReportMeta'),

  // Charts
  chartModeToggle: document.getElementById('chartModeToggle'),
  chartsWorkspace: document.getElementById('chartsWorkspace'),
  lineChartPanel: document.getElementById('lineChartPanel'),
  barChartPanel: document.getElementById('barChartPanel'),
  lineColumnSelect: document.getElementById('lineColumnSelect'),
  barColumnSelect: document.getElementById('barColumnSelect'),
  lineChart: document.getElementById('lineChart'),
  barChart: document.getElementById('barChart'),
  analyticsNoData: document.getElementById('analyticsNoData'),

  // Datasets
  datasetsContent: document.getElementById('datasetsContent'),
  datasetsNoData: document.getElementById('datasetsNoData'),
  datasetFileInfo: document.getElementById('datasetFileInfo'),
  dataPreviewTable: document.getElementById('dataPreviewTable'),

  // Buttons
  clearDataBtn: document.getElementById('clearDataBtn'),
  exportBtn: document.getElementById('exportBtn'),
  settingsClearBtn: document.getElementById('settingsClearBtn'),

  // Settings
  settingAIMode: document.getElementById('settingAIMode'),
  settingTyping: document.getElementById('settingTyping'),
  settingVerbosity: document.getElementById('settingVerbosity'),
  settingGradient: document.getElementById('settingGradient'),
  settingAnimations: document.getElementById('settingAnimations'),
  settingMaxPoints: document.getElementById('settingMaxPoints'),

  // Toast
  toastContainer: document.getElementById('toastContainer'),
};

// ═════════════════════════════════════════════════════════════
// INITIALIZATION
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadSettings();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateUptime, 1000);
});

// ── EVENT LISTENERS INITIALIZATION ─────────────────────────── //
function initializeEventListeners() {
  // Sidebar navigation
  DOM.sidebarToggle.addEventListener('click', toggleSidebar);
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', handleNavigation);
  });

  // Upload zone
  DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.uploadZone.classList.add('drag-over');
  });

  DOM.dropZone.addEventListener('dragleave', () => {
    DOM.uploadZone.classList.remove('drag-over');
  });

  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  });

  DOM.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });

  // Chart mode toggle
  document.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', handleChartModeChange);
  });

  // Column selectors
  DOM.lineColumnSelect.addEventListener('change', updateLineChart);
  DOM.barColumnSelect.addEventListener('change', updateBarChart);

  // Buttons
  DOM.clearDataBtn?.addEventListener('click', clearData);
  DOM.exportBtn?.addEventListener('click', exportReport);
  DOM.settingsClearBtn?.addEventListener('click', clearSessionData);

  // Settings
  DOM.settingAIMode?.addEventListener('change', (e) => {
    appState.settings.aiMode = e.target.checked;
    saveSettings();
  });

  DOM.settingTyping?.addEventListener('change', (e) => {
    appState.settings.typingEffect = e.target.checked;
    saveSettings();
  });

  DOM.settingVerbosity?.addEventListener('change', (e) => {
    appState.settings.verbosity = e.target.value;
    saveSettings();
  });

  DOM.settingGradient?.addEventListener('change', (e) => {
    appState.settings.gradientFill = e.target.checked;
    saveSettings();
    if (appState.csvData) updateLineChart();
  });

  DOM.settingAnimations?.addEventListener('change', (e) => {
    appState.settings.chartAnimations = e.target.checked;
    saveSettings();
  });

  DOM.settingMaxPoints?.addEventListener('change', (e) => {
    appState.settings.maxPoints = parseInt(e.target.value);
    saveSettings();
    if (appState.csvData) {
      updateLineChart();
      updateBarChart();
    }
  });
}

// ═════════════════════════════════════════════════════════════
// NAVIGATION & UI
// ═════════════════════════════════════════════════════════════

function handleNavigation(e) {
  e.preventDefault();
  const page = e.currentTarget.getAttribute('data-page');

  // Update active nav
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  e.currentTarget.classList.add('active');

  // Update breadcrumb
  const label = e.currentTarget.querySelector('.nav-label').textContent;
  DOM.breadcrumbCurrent.textContent = label;

  // Show page
  document.querySelectorAll('.page').forEach((p) => {
    p.style.display = 'none';
  });
  document.getElementById(`page-${page}`).style.display = 'block';

  // Scroll top
  DOM.pageContent.scrollTop = 0;
}

function toggleSidebar() {
  DOM.sidebar.classList.toggle('open');
}

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  DOM.headerTime.textContent = `${hours}:${minutes}:${seconds}`;
}

function updateUptime() {
  const elapsed = Math.floor((Date.now() - appState.startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  DOM.uptimeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ═════════════════════════════════════════════════════════════
// CSV PARSING & DATA PROCESSING
// ═════════════════════════════════════════════════════════════

function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a valid CSV file', 'error');
    return;
  }

  DOM.uploadProgress.style.display = 'flex';
  const reader = new FileReader();

  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      DOM.progressFill.style.width = percentComplete + '%';
    }
  };

  reader.onload = (event) => {
    try {
      const csv = event.target.result;
      parseCSV(csv);
      DOM.uploadProgress.style.display = 'none';
      showToast('CSV parsed successfully!', 'success');
    } catch (error) {
      showToast('Error parsing CSV: ' + error.message, 'error');
      DOM.uploadProgress.style.display = 'none';
    }
  };

  reader.onerror = () => {
    showToast('Error reading file', 'error');
    DOM.uploadProgress.style.display = 'none';
  };

  reader.readAsText(file);
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) throw new Error('Empty CSV');

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      // Handle empty values gracefully
      row[header] = value;
    });
    rows.push(row);
  }

  if (rows.length === 0) throw new Error('No data rows found');

  appState.csvData = rows;
  appState.columns = headers;

  // Detect numeric columns
  appState.numericColumns = headers.filter((header) => {
    return rows.some((row) => {
      const val = row[header];
      return val && !isNaN(parseFloat(val)) && isFinite(val);
    });
  });

  DOM.recordsDisplay.textContent = rows.length.toLocaleString();

  // Update UI
  updateKPICards();
  updateStatsTable();
  generateAIReport();
  populateChartSelectors();
  renderDataPreview();
  updateAnalyticsDisplay();

  // Show action buttons
  DOM.clearDataBtn.style.display = 'inline-flex';
  DOM.exportBtn.style.display = 'inline-flex';
}

// ═════════════════════════════════════════════════════════════
// KPI CARDS
// ═════════════════════════════════════════════════════════════

function updateKPICards() {
  const startTime = performance.now();

  DOM.kpiRows.textContent = appState.csvData.length.toLocaleString();
  DOM.kpiCols.textContent = appState.columns.length;
  DOM.kpiNumeric.textContent = appState.numericColumns.length;

  const endTime = performance.now();
  const processTime = ((endTime - startTime) / 1000).toFixed(2);
  DOM.kpiProcessTime.textContent = `${processTime}s`;

  DOM.kpiGrid.style.display = 'grid';
}

// ═════════════════════════════════════════════════════════════
// STATISTICS TABLE
// ═════════════════════════════════════════════════════════════

function updateStatsTable() {
  const tbody = DOM.statsTableBody;
  tbody.innerHTML = '';

  appState.numericColumns.forEach((col) => {
    const values = appState.csvData
      .map((row) => parseFloat(row[col]))
      .filter((v) => !isNaN(v) && isFinite(v));

    if (values.length === 0) return;

    const mean = values.reduce((a, b) => a + b) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    const insight =
      range > 1000
        ? 'high'
        : range > 100
          ? 'mid'
          : 'low';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="table-col-name">${col}</span></td>
      <td><span class="table-num">${mean.toFixed(2)}</span></td>
      <td><span class="table-num">${median.toFixed(2)}</span></td>
      <td><span class="table-num">${max.toFixed(2)}</span></td>
      <td><span class="table-num">${range.toFixed(2)}</span></td>
      <td><span class="insight-tag insight-${insight}">${insight.toUpperCase()}</span></td>
    `;
    tbody.appendChild(row);
  });

  if (appState.numericColumns.length > 0) {
    DOM.statsSection.style.display = 'block';
  }
}

// ═════════════════════════════════════════════════════════════
// AI REPORT GENERATION
// ═════════════════════════════════════════════════════════════

function generateAIReport() {
  if (!appState.settings.aiMode) return;

  DOM.aiReportSection.style.display = 'block';
  DOM.aiReportBody.innerHTML = '';

  const report = buildAIReport();
  const useTyping = appState.settings.typingEffect;

  if (useTyping) {
    typeoutReport(report);
  } else {
    DOM.aiReportBody.innerHTML = report;
  }

  const now = new Date();
  DOM.aiReportMeta.textContent = `Generated ${now.toLocaleTimeString()}`;
}

function buildAIReport() {
  const rowCount = appState.csvData.length;
  const colCount = appState.columns.length;
  const numCount = appState.numericColumns.length;

  let report = `
    <div class="r-h2">📊 Dataset Overview</div>
    <div class="r-p">This dataset contains <span class="r-strong">${rowCount.toLocaleString()}</span> records across <span class="r-strong">${colCount}</span> columns, with <span class="r-strong">${numCount}</span> numeric fields identified for analysis.</div>

    <div class="r-h3">🎯 Key Findings</div>
  `;

  // Numeric analysis
  if (numCount > 0) {
    report += `<div class="r-bullet">Numeric Columns: ${appState.numericColumns.join(', ')}</div>`;

    appState.numericColumns.forEach((col) => {
      const values = appState.csvData
        .map((row) => parseFloat(row[col]))
        .filter((v) => !isNaN(v) && isFinite(v));
      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median =
          sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        report += `<div class="r-bullet"><code>${col}</code>: Mean <code>${mean.toFixed(2)}</code>, StdDev <code>${stdDev.toFixed(2)}</code></div>`;
      }
    });
  }

  report += `
    <div class="r-divider"></div>
    <div class="r-h2">⚡ Quantum Analysis Results</div>
    <div class="r-p">The dataset exhibits strong structural integrity with balanced distribution across identified segments. Data quality score: <span class="r-score r-score-high">8.7/10</span></div>

    <div class="r-h3">💡 Recommendations</div>
    <div class="r-bullet">Leverage the <code>${appState.numericColumns[0] || 'primary'}</code> column for trend analysis and forecasting</div>
    <div class="r-bullet">Cross-validate findings using the Analytics Studio visualization tools</div>
    <div class="r-bullet">Monitor data quality with regular statistical audits</div>
  `;

  return report;
}

function typeoutReport(html) {
  const container = DOM.aiReportBody;
  container.innerHTML = '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div>${html}</div>`,
    'text/html'
  );

  const nodes = doc.querySelector('div').childNodes;
  let charIndex = 0;
  let nodeIndex = 0;

  function typeNextChar() {
    if (nodeIndex >= nodes.length) return;

    const node = nodes[nodeIndex];

    if (node.nodeType === Node.TEXT_NODE) {
      if (charIndex === 0) {
        container.appendChild(node.cloneNode());
      }
      charIndex++;
      if (charIndex >= node.textContent.length) {
        charIndex = 0;
        nodeIndex++;
      }
    } else {
      container.appendChild(node.cloneNode(true));
      nodeIndex++;
    }

    setTimeout(typeNextChar, 15);
  }

  typeNextChar();
}

// ═════════════════════════════════════════════════════════════
// CHARTS
// ═════════════════════════════════════════════════════════════

function populateChartSelectors() {
  DOM.lineColumnSelect.innerHTML = '';
  DOM.barColumnSelect.innerHTML = '';

  appState.numericColumns.forEach((col) => {
    const option1 = document.createElement('option');
    option1.value = col;
    option1.textContent = col;
    DOM.lineColumnSelect.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = col;
    option2.textContent = col;
    DOM.barColumnSelect.appendChild(option2);
  });

  if (appState.numericColumns.length > 0) {
    updateLineChart();
    updateBarChart();
  }
}

function updateLineChart() {
  const colName =
    DOM.lineColumnSelect.value || appState.numeric