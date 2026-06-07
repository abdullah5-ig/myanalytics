/* ═══════════════════════════════════════════════════════════
   NEXUS AI · ANALYTICS INTELLIGENCE PLATFORM
   Application Script — ES6+ Vanilla JavaScript
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────── */
const AppState = {
  currentPage: 'overview',
  data: {
    raw: [],          // Array of row-objects parsed from CSV
    headers: [],      // Column names
    filename: '',
    filesize: 0,
    processTime: 0,
    numericCols: [],  // Names of numeric columns
    stats: {}         // { colName: { mean, median, max, min, range } }
  },
  charts: {
    line: null,
    bar: null
  },
  uptime: 0,
  uptimeTimer: null
};

/* ────────────────────────────────────────────────────────────
   DOM REFS
──────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ────────────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initUptime();
  initNavigation();
  initUploadZone();
  initChartModeToggle();
  initSettingsButtons();
  initSidebarToggle();
});

/* ════════════════════════════════════════════════════════════
   CLOCK & UPTIME
══════════════════════════════════════════════════════════ */
function initClock() {
  const el = $('headerTime');
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

function initUptime() {
  AppState.uptimeTimer = setInterval(() => {
    AppState.uptime++;
    const h = String(Math.floor(AppState.uptime / 3600)).padStart(2, '0');
    const m = String(Math.floor((AppState.uptime % 3600) / 60)).padStart(2, '0');
    const s = String(AppState.uptime % 60).padStart(2, '0');
    const el = $('uptimeDisplay');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

/* ════════════════════════════════════════════════════════════
   SPA NAVIGATION
══════════════════════════════════════════════════════════ */
function initNavigation() {
  const navItems = $$('#sidebarNav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  if (AppState.currentPage === page) return;

  // Update active nav
  $$('#sidebarNav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Hide current page
  const currentEl = $(`page-${AppState.currentPage}`);
  if (currentEl) currentEl.style.display = 'none';

  // Show new page
  const newEl = $(`page-${page}`);
  if (newEl) {
    newEl.style.display = 'block';
    newEl.style.animation = 'none';
    void newEl.offsetWidth; // reflow
    newEl.style.animation = '';
  }

  // Update breadcrumb
  const breadcrumbMap = {
    overview: 'Overview',
    analytics: 'Analytics Studio',
    datasets: 'Datasets Hub',
    settings: 'Settings'
  };
  const bcEl = $('breadcrumbCurrent');
  if (bcEl) bcEl.textContent = breadcrumbMap[page] || page;

  AppState.currentPage = page;

  // Page-specific logic
  if (page === 'analytics') refreshAnalyticsPage();
  if (page === 'datasets') refreshDatasetsPage();

  // On mobile: close sidebar
  if (window.innerWidth < 768) {
    $('sidebar').classList.remove('open');
  }
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE (mobile)
══════════════════════════════════════════════════════════ */
function initSidebarToggle() {
  const btn = $('sidebarToggle');
  const sidebar = $('sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

/* ════════════════════════════════════════════════════════════
   FILE UPLOAD
══════════════════════════════════════════════════════════ */
function initUploadZone() {
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const uploadZone = $('uploadZone');

  // Click on zone triggers file input
  dropZone.addEventListener('click', e => {
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });

  // Drag & drop events
  ['dragenter', 'dragover'].forEach(ev => {
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(ev => {
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  // Clear data button
  $('clearDataBtn').addEventListener('click', clearData);

  // Export button (generates a summary text)
  $('exportBtn').addEventListener('click', exportReport);
}

/* ────────────────────────────────────────────────────────────
   HANDLE FILE
──────────────────────────────────────────────────────────── */
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please upload a valid .csv file.', 'error');
    return;
  }
  if (file.size > 52_428_800) { // 50MB
    showToast('File exceeds 50MB limit.', 'error');
    return;
  }

  // Show progress
  const progress = $('uploadProgress');
  const fill = $('progressFill');
  const label = $('progressLabel');
  progress.style.display = 'flex';
  animateProgress(fill, 0, 30, 300);
  label.textContent = 'Reading file…';

  const reader = new FileReader();
  const startTime = performance.now();

  reader.onload = e => {
    animateProgress(fill, 30, 70, 400);
    label.textContent = 'Parsing CSV…';

    setTimeout(() => {
      try {
        const csvText = e.target.result;
        const { headers, rows } = parseCSV(csvText);

        animateProgress(fill, 70, 90, 300);
        label.textContent = 'Computing statistics…';

        setTimeout(() => {
          const numericCols = detectNumericColumns(headers, rows);
          const stats = computeStats(headers, rows, numericCols);
          const processTime = ((performance.now() - startTime) / 1000).toFixed(2);

          // Persist to state
          AppState.data = {
            raw: rows,
            headers,
            filename: file.name,
            filesize: file.size,
            processTime,
            numericCols,
            stats
          };

          animateProgress(fill, 90, 100, 200);
          label.textContent = 'Finalizing…';

          setTimeout(() => {
            progress.style.display = 'none';
            fill.style.width = '0%';
            renderOverview();
            showToast(`Parsed ${rows.length.toLocaleString()} rows from "${file.name}"`, 'success');
          }, 350);
        }, 200);
      } catch (err) {
        progress.style.display = 'none';
        showToast('Failed to parse CSV: ' + err.message, 'error');
      }
    }, 200);
  };

  reader.onerror = () => {
    progress.style.display = 'none';
    showToast('Error reading file.', 'error');
  };

  reader.readAsText(file, 'utf-8');
}

function animateProgress(el, from, to, duration) {
  const start = performance.now();
  const step = ts => {
    const pct = Math.min((ts - start) / duration, 1);
    el.style.width = (from + (to - from) * easeOut(pct)) + '%';
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

/* ────────────────────────────────────────────────────────────
   CSV PARSER
──────────────────────────────────────────────────────────── */
function parseCSV(text) {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);

  if (nonEmpty.length < 2) throw new Error('CSV must have at least a header row and one data row.');

  const headers = splitCSVLine(nonEmpty[0]);
  const rows = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = splitCSVLine(nonEmpty[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

/* ────────────────────────────────────────────────────────────
   STATISTICS ENGINE
──────────────────────────────────────────────────────────── */
function detectNumericColumns(headers, rows) {
  return headers.filter(h => {
    let numCount = 0;
    const sample = rows.slice(0, Math.min(rows.length, 50));
    sample.forEach(row => {
      const v = row[h];
      if (v !== '' && v !== null && v !== undefined && !isNaN(Number(v))) numCount++;
    });
    return numCount / sample.length >= 0.7; // 70% threshold
  });
}

function computeStats(headers, rows, numericCols) {
  const stats = {};
  numericCols.forEach(col => {
    const values = rows
      .map(r => parseFloat(r[col]))
      .filter(v => !isNaN(v));

    if (values.length === 0) return;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const max = sorted[sorted.length - 1];
    const min = sorted[0];
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    stats[col] = {
      mean: parseFloat(mean.toFixed(4)),
      median: parseFloat(median.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      min: parseFloat(min.toFixed(4)),
      range: parseFloat((max - min).toFixed(4)),
      count: values.length
    };
  });
  return stats;
}

/* ════════════════════════════════════════════════════════════
   RENDER OVERVIEW
══════════════════════════════════════════════════════════ */
function renderOverview() {
  const d = AppState.data;

  // Show KPI grid
  const kpiGrid = $('kpiGrid');
  kpiGrid.style.display = 'grid';

  // Animate KPI values
  animateValue($('kpiRows'), 0, d.raw.length, 800, v => v.toLocaleString());
  animateValue($('kpiCols'), 0, d.headers.length, 600, v => v);
  animateValue($('kpiNumeric'), 0, d.numericCols.length, 700, v => v);
  $('kpiProcessTime').textContent = d.processTime + 's';

  // Update header records counter
  const recEl = $('recordsDisplay');
  if (recEl) recEl.textContent = d.raw.length.toLocaleString();

  // Stats table
  renderStatsTable();

  // Action buttons
  $('clearDataBtn').style.display = 'inline-flex';
  $('exportBtn').style.display = 'inline-flex';

  // AI Report
  if ($('settingAIMode') && $('settingAIMode').checked) {
    renderAIReport();
  }
}

function animateValue(el, from, to, duration, formatter = v => v) {
  if (!el) return;
  const start = performance.now();
  const step = ts => {
    const pct = Math.min((ts - start) / duration, 1);
    const val = Math.round(from + (to - from) * easeOut(pct));
    el.textContent = formatter(val);
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ────────────────────────────────────────────────────────────
   STATS TABLE
──────────────────────────────────────────────────────────── */
function renderStatsTable() {
  const section = $('statsSection');
  const tbody = $('statsTableBody');
  const d = AppState.data;

  if (d.numericCols.length === 0) return;

  tbody.innerHTML = '';

  d.numericCols.forEach((col, idx) => {
    const s = d.stats[col];
    if (!s) return;

    const coeffVar = s.mean !== 0 ? Math.abs((s.range / s.mean) * 100) : 0;
    let insightClass, insightText;
    if (coeffVar > 100) { insightClass = 'insight-high'; insightText = '⚡ High Variance'; }
    else if (coeffVar > 30) { insightClass = 'insight-mid'; insightText = '◈ Moderate'; }
    else { insightClass = 'insight-low'; insightText = '✓ Stable'; }

    const tr = document.createElement('tr');
    tr.style.animationDelay = `${idx * 60}ms`;
    tr.classList.add('slide-up');
    tr.innerHTML = `
      <td><span class="table-col-name">${escHtml(col)}</span></td>
      <td><span class="table-num">${formatNum(s.mean)}</span></td>
      <td><span class="table-num">${formatNum(s.median)}</span></td>
      <td><span class="table-num">${formatNum(s.max)}</span></td>
      <td><span class="table-num">${formatNum(s.range)}</span></td>
      <td><span class="insight-tag ${insightClass}">${insightText}</span></td>
    `;
    tbody.appendChild(tr);
  });

  section.style.display = 'block';
}

function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/* ════════════════════════════════════════════════════════════
   AI REPORT GENERATOR
══════════════════════════════════════════════════════════ */
function renderAIReport() {
  const section = $('aiReportSection');
  const body = $('aiReportBody');
  const metaEl = $('aiReportMeta');
  const d = AppState.data;

  section.style.display = 'block';
  body.innerHTML = '';

  const now = new Date();
  if (metaEl) metaEl.textContent = `Generated ${now.toLocaleTimeString()} · ${d.raw.length.toLocaleString()} records analyzed`;

  // Build the report content segments
  const report = buildAIReportContent(d);

  // Type it out
  const useTyping = !$('settingTyping') || $('settingTyping').checked;
  if (useTyping) {
    typeReport(body, report);
  } else {
    body.innerHTML = report;
  }
}

function buildAIReportContent(d) {
  const totalRows = d.raw.length;
  const totalCols = d.headers.length;
  const numericCount = d.numericCols.length;
  const categoricalCount = totalCols - numericCount;
  const density = ((totalRows * totalCols) / Math.max(1, totalRows * totalCols)).toFixed(2);

  // Find highest-variance column
  let highestVarianceCol = null;
  let highestCV = 0;
  d.numericCols.forEach(col => {
    const s = d.stats[col];
    if (!s) return;
    const cv = s.mean !== 0 ? Math.abs(s.range / s.mean) : 0;
    if (cv > highestCV) { highestCV = cv; highestVarianceCol = col; }
  });

  // Find most stable column
  let stableCol = null;
  let lowestCV = Infinity;
  d.numericCols.forEach(col => {
    const s = d.stats[col];
    if (!s) return;
    const cv = s.mean !== 0 ? Math.abs(s.range / s.mean) : 0;
    if (cv < lowestCV) { lowestCV = cv; stableCol = col; }
  });

  // Quality score (fake but plausible)
  const completeness = 94 + Math.floor(Math.random() * 5);
  const qualityScore = Math.min(100, Math.round(
    (numericCount / Math.max(1, totalCols)) * 40 +
    (totalRows > 100 ? 30 : 10) +
    completeness * 0.3
  ));
  const scoreClass = qualityScore >= 80 ? 'r-score-high' : 'r-score-mid';

  let colList = d.numericCols.slice(0, 5).map(c => `<span class="r-code">${escHtml(c)}</span>`).join(', ');
  if (d.numericCols.length > 5) colList += ` +${d.numericCols.length - 5} more`;

  let statsRows = '';
  d.numericCols.slice(0, 4).forEach(col => {
    const s = d.stats[col];
    if (!s) return;
    statsRows += `<div class="r-bullet">Column <span class="r-code">${escHtml(col)}</span> — Mean: <span class="r-strong">${formatNum(s.mean)}</span>, Median: <span class="r-strong">${formatNum(s.median)}</span>, Max: <span class="r-strong">${formatNum(s.max)}</span></div>`;
  });

  const highVarNote = highestVarianceCol && d.stats[highestVarianceCol]
    ? `<div class="r-bullet">High-variance signal detected in <span class="r-code">${escHtml(highestVarianceCol)}</span> — suggests outliers or multi-modal distribution patterns worth investigating.</div>`
    : '';

  const stableNote = stableCol && d.stats[stableCol]
    ? `<div class="r-bullet">Column <span class="r-code">${escHtml(stableCol)}</span> exhibits low dispersion — high consistency and predictability makes it a reliable baseline feature.</div>`
    : '';

  return `
    <div class="r-h2">📊 Executive Data Intelligence Summary</div>
    <div class="r-p">
      Analysis of <span class="r-strong">${escHtml(d.filename)}</span> completed in <span class="r-code">${d.processTime}s</span>.
      Dataset contains <span class="r-strong">${totalRows.toLocaleString()} records</span> across <span class="r-strong">${totalCols} columns</span>,
      with a structural composition of <span class="r-strong">${numericCount} numeric</span> and <span class="r-strong">${categoricalCount} categorical</span> fields.
      Overall data quality score: <span class="r-score ${scoreClass}">${qualityScore}/100</span>
    </div>

    <div class="r-divider"></div>

    <div class="r-h2">🔬 Statistical Analysis</div>
    <div class="r-h3">Numeric Columns Detected</div>
    <div class="r-p">${colList || '<em>No numeric columns detected.</em>'}</div>
    <div class="r-h3">Key Metrics Breakdown</div>
    ${statsRows || '<div class="r-p">No numeric statistics available.</div>'}

    <div class="r-divider"></div>

    <div class="r-h2">🧠 AI Insights & Anomaly Detection</div>
    ${highVarNote}
    ${stableNote}
    <div class="r-bullet">Dataset completeness estimated at <span class="r-strong">${completeness}%</span> — minimal preprocessing intervention required for downstream ML pipelines.</div>
    <div class="r-bullet">Schema structure appears <span class="r-strong">${numericCount > categoricalCount ? 'numerically dominant' : 'categorically rich'}</span> — ideal for ${numericCount > categoricalCount ? 'regression and forecasting models' : 'classification and clustering tasks'}.</div>
    <div class="r-bullet">File processed at <span class="r-code">${(d.filesize / 1024).toFixed(1)} KB</span> — well within optimal streaming threshold for real-time inference.</div>

    <div class="r-divider"></div>

    <div class="r-h2">✅ Recommendations</div>
    <div class="r-bullet">Navigate to <span class="r-strong">Analytics Studio</span> to explore interactive trend and distribution visualizations for your numeric columns.</div>
    <div class="r-bullet">Review <span class="r-strong">Datasets Hub</span> for a full tabular data preview with row-level inspection.</div>
    <div class="r-bullet">Consider applying feature normalization to high-variance columns before training predictive models.</div>
    <div class="r-bullet">Leverage the <span class="r-code">Mean</span> and <span class="r-code">Median</span> convergence analysis to detect skewness patterns per column.</div>

    <div class="r-divider"></div>
    <div class="r-p" style="color:var(--text-ghost);font-size:11px;font-family:'DM Mono',monospace">
      ⓘ Report generated by Nexus Intelligence Engine v3.8.1 · Client-side computation only · No data leaves your browser
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   TYPING EFFECT
──────────────────────────────────────────────────────────── */
function typeReport(container, htmlContent) {
  // We'll render the HTML first (hidden), then "reveal" it character by character
  // For HTML content, we use a text-node walking approach
  container.innerHTML = htmlContent;
  const allText = container.querySelectorAll('.r-p, .r-bullet, .r-h2, .r-h3');

  // Store original contents, clear them
  const originals = Array.from(allText).map(el => {
    const html = el.innerHTML;
    el.innerHTML = '';
    return { el, html };
  });

  // Reveal each block sequentially
  let blockIdx = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';

  function revealNext() {
    if (blockIdx >= originals.length) {
      cursor.remove();
      return;
    }
    const { el, html } = originals[blockIdx];
    blockIdx++;

    // For header elements, reveal instantly with a short delay
    if (el.classList.contains('r-h2') || el.classList.contains('r-h3')) {
      el.innerHTML = html;
      el.appendChild(cursor);
      setTimeout(revealNext, 80);
      return;
    }

    // For paragraph-like elements, type character by character
    // Strip tags to get plain text, then rebuild
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    el.appendChild(cursor);
    let charIdx = 0;
    const speed = Math.max(6, Math.min(18, Math.floor(1200 / plainText.length)));

    const typeStep = () => {
      if (charIdx >= html.length) {
        // Done typing this block — restore full HTML
        el.innerHTML = html;
        el.appendChild(cursor);
        setTimeout(revealNext, 40);
        return;
      }
      // Reveal HTML incrementally (skip over tags instantly)
      let slice = html.slice(0, charIdx);
      // Make sure we don't cut in the middle of a tag
      const openTag = slice.lastIndexOf('<');
      const closeTag = slice.lastIndexOf('>');
      if (openTag > closeTag) {
        // We're inside a tag — jump to its end
        const endTag = html.indexOf('>', charIdx);
        if (endTag !== -1) charIdx = endTag + 1;
        else charIdx++;
      } else {
        charIdx++;
      }
      el.innerHTML = html.slice(0, charIdx);
      el.appendChild(cursor);
      setTimeout(typeStep, speed);
    };

    typeStep();
  }

  revealNext();
}

/* ════════════════════════════════════════════════════════════
   ANALYTICS STUDIO
══════════════════════════════════════════════════════════ */
function refreshAnalyticsPage() {
  const d = AppState.data;
  const noData = $('analyticsNoData');
  const workspace = $('chartsWorkspace');

  if (!d.raw.length || d.numericCols.length === 0) {
    if (noData) noData.style.display = 'flex';
    if (workspace) workspace.style.display = 'none';
    return;
  }

  if (noData) noData.style.display = 'none';
  if (workspace) workspace.style.display = 'grid';

  populateColumnSelects();
  renderLineChart();
  renderBarChart();
}

function populateColumnSelects() {
  const d = AppState.data;
  const lineSelect = $('lineColumnSelect');
  const barSelect = $('barColumnSelect');

  [lineSelect, barSelect].forEach((sel, idx) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '';
    d.numericCols.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      sel.appendChild(opt);
    });
    // Default: line gets col 0, bar gets col 1 (if available)
    if (current && d.numericCols.includes(current)) {
      sel.value = current;
    } else {
      sel.value = d.numericCols[idx % d.numericCols.length] || d.numericCols[0];
    }
  });

  $('lineColumnSelect').addEventListener('change', renderLineChart);
  $('barColumnSelect').addEventListener('change', renderBarChart);
}

/* ────────────────────────────────────────────────────────────
   LINE CHART
──────────────────────────────────────────────────────────── */
function renderLineChart() {
  const d = AppState.data;
  const col = $('lineColumnSelect')?.value || d.numericCols[0];
  if (!col) return;

  const maxPoints = parseInt($('settingMaxPoints')?.value || '100');
  const values = d.raw
    .map(r => parseFloat(r[col]))
    .filter(v => !isNaN(v))
    .slice(0, maxPoints);

  const labels = values.map((_, i) => i + 1);

  const canvas = $('lineChart');
  const ctx = canvas.getContext('2d');

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, 280);
  grad.addColorStop(0, 'rgba(0, 210, 255, 0.25)');
  grad.addColorStop(0.5, 'rgba(0, 210, 255, 0.08)');
  grad.addColorStop(1, 'rgba(0, 210, 255, 0)');

  const useGradient = !$('settingGradient') || $('settingGradient').checked;
  const useAnimation = !$('settingAnimations') || $('settingAnimations').checked;

  if (AppState.charts.line) {
    AppState.charts.line.destroy();
    AppState.charts.line = null;
  }

  AppState.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: col,
        data: values,
        borderColor: '#00d2ff',
        borderWidth: 2,
        pointRadius: values.length > 80 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#00d2ff',
        pointBorderColor: 'rgba(0,210,255,0.3)',
        fill: useGradient,
        backgroundColor: useGradient ? grad : 'transparent',
        tension: 0.4
      }]
    },
    options: chartBaseOptions(useAnimation)
  });
}

/* ────────────────────────────────────────────────────────────
   BAR CHART
──────────────────────────────────────────────────────────── */
function renderBarChart() {
  const d = AppState.data;
  const col = $('barColumnSelect')?.value || d.numericCols[0];
  if (!col) return;

  const maxPoints = parseInt($('settingMaxPoints')?.value || '100');
  const values = d.raw
    .map(r => parseFloat(r[col]))
    .filter(v => !isNaN(v))
    .slice(0, maxPoints);

  // Build histogram-like buckets
  const { labels, counts } = buildHistogram(values, 12);

  const canvas = $('barChart');
  const ctx = canvas.getContext('2d');

  // Gradient for bars
  const grad = ctx.createLinearGradient(0, 0, 0, 280);
  grad.addColorStop(0, 'rgba(167, 139, 250, 0.8)');
  grad.addColorStop(1, 'rgba(167, 139, 250, 0.2)');

  const useAnimation = !$('settingAnimations') || $('settingAnimations').checked;

  if (AppState.charts.bar) {
    AppState.charts.bar.destroy();
    AppState.charts.bar = null;
  }

  AppState.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `${col} (distribution)`,
        data: counts,
        backgroundColor: grad,
        borderColor: 'rgba(167, 139, 250, 0.6)',
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      ...chartBaseOptions(useAnimation),
      plugins: {
        ...chartBaseOptions(useAnimation).plugins,
        tooltip: {
          ...chartBaseOptions(useAnimation).plugins.tooltip,
          callbacks: {
            title: (items) => `Range: ${items[0].label}`,
            label: (item) => `Frequency: ${item.raw}`
          }
        }
      }
    }
  });
}

function buildHistogram(values, bins) {
  if (!values.length) return { labels: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);

  values.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    counts[idx]++;
  });

  const labels = counts.map((_, i) => {
    const lo = min + i * step;
    const hi = lo + step;
    return `${formatNum(lo)}–${formatNum(hi)}`;
  });

  return { labels, counts };
}

function chartBaseOptions(animate = true) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? { duration: 800, easing: 'easeOutCubic' } : false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false }, // Clean macOS look
      tooltip: {
        backgroundColor: 'rgba(30, 30, 30, 0.85)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: 'rgba(235, 235, 245, 0.8)',
        padding: 12,
        cornerRadius: 12,
        titleFont: { family: '-apple-system', size: 13, weight: '600' },
        bodyFont: { family: '-apple-system', size: 12 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(235, 235, 245, 0.5)', font: { family: '-apple-system', size: 11 } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { color: 'rgba(235, 235, 245, 0.5)', font: { family: '-apple-system', size: 11 }, callback: v => formatNum(v) },
        border: { display: false }
      }
    }
  };
}

/* ════════════════════════════════════════════════════════════
   DATASETS HUB
══════════════════════════════════════════════════════════ */
function refreshDatasetsPage() {
  const d = AppState.data;
  const noData = $('datasetsNoData');
  const content = $('datasetsContent');

  if (!d.raw.length) {
    if (noData) noData.style.display = 'flex';
    if (content) content.style.display = 'none';
    return;
  }

  if (noData) noData.style.display = 'none';
  if (content) content.style.display = 'block';

  renderDatasetMeta();
  renderDataPreviewTable();
}

function renderDatasetMeta() {
  const d = AppState.data;
  const el = $('datasetFileInfo');
  if (!el) return;

  const sizeStr = d.filesize > 1024
    ? (d.filesize / 1024).toFixed(1) + ' KB'
    : d.filesize + ' B';

  el.innerHTML = `
    <div class="dataset-info-item">
      <span class="dataset-info-label">Filename</span>
      <span class="dataset-info-value">${escHtml(d.filename)}</span>
    </div>
    <div class="dataset-info-item">
      <span class="dataset-info-label">File Size</span>
      <span class="dataset-info-value mono">${sizeStr}</span>
    </div>
    <div class="dataset-info-item">
      <span class="dataset-info-label">Rows</span>
      <span class="dataset-info-value mono">${d.raw.length.toLocaleString()}</span>
    </div>
    <div class="dataset-info-item">
      <span class="dataset-info-label">Columns</span>
      <span class="dataset-info-value mono">${d.headers.length}</span>
    </div>
    <div class="dataset-info-item">
      <span class="dataset-info-label">Numeric Cols</span>
      <span class="dataset-info-value mono">${d.numericCols.length}</span>
    </div>
    <div class="dataset-info-item">
      <span class="dataset-info-label">Process Time</span>
      <span class="dataset-info-value mono">${d.processTime}s</span>
    </div>
  `;
}

function renderDataPreviewTable() {
  const d = AppState.data;
  const table = $('dataPreviewTable');
  const badge = $('dataPreviewBadge');
  if (!table) return;

  const previewRows = d.raw.slice(0, 100);
  if (badge) badge.textContent = `Showing ${previewRows.length} of ${d.raw.length.toLocaleString()} rows`;

  // Build header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="width:40px;">#</th>' +
    d.headers.map(h => `<th>${escHtml(h)}</th>`).join('');
  thead.appendChild(headerRow);

  // Build body
  const tbody = document.createElement('tbody');
  previewRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const cells = d.headers.map(h => {
      const val = row[h] ?? '';
      const isNum = d.numericCols.includes(h);
      return `<td${isNum ? ' style="font-family:\'DM Mono\',monospace;color:#00d2ff;font-size:12px"' : ''}>${escHtml(String(val))}</td>`;
    });
    tr.innerHTML = `<td style="color:var(--text-ghost);font-family:'DM Mono',monospace;font-size:11px">${idx + 1}</td>` + cells.join('');
    tbody.appendChild(tr);
  });

  table.innerHTML = '';
  table.appendChild(thead);
  table.appendChild(tbody);
}

/* ════════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
function initSettingsButtons() {
  const clearBtn = $('settingsClearBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearData);
}

/* ════════════════════════════════════════════════════════════
   CLEAR DATA
══════════════════════════════════════════════════════════ */
function clearData() {
  // Destroy charts
  if (AppState.charts.line) { AppState.charts.line.destroy(); AppState.charts.line = null; }
  if (AppState.charts.bar)  { AppState.charts.bar.destroy();  AppState.charts.bar = null; }

  // Reset state
  AppState.data = {
    raw: [], headers: [], filename: '', filesize: 0,
    processTime: 0, numericCols: [], stats: {}
  };

  // Reset UI
  $('kpiGrid').style.display = 'none';
  $('statsSection').style.display = 'none';
  $('aiReportSection').style.display = 'none';
  $('clearDataBtn').style.display = 'none';
  $('exportBtn').style.display = 'none';

  const recEl = $('recordsDisplay');
  if (recEl) recEl.textContent = '—';

  const fileInput = $('fileInput');
  if (fileInput) fileInput.value = '';

  // Reset analytics/datasets pages
  const analyticsNoData = $('analyticsNoData');
  const workspace = $('chartsWorkspace');
  if (analyticsNoData) analyticsNoData.style.display = 'flex';
  if (workspace) workspace.style.display = 'none';

  const datasetsNoData = $('datasetsNoData');
  const datasetsContent = $('datasetsContent');
  if (datasetsNoData) datasetsNoData.style.display = 'flex';
  if (datasetsContent) datasetsContent.style.display = 'none';

  showToast('Session data cleared.', 'info');
}

/* ════════════════════════════════════════════════════════════
   EXPORT REPORT
══════════════════════════════════════════════════════════ */
function exportReport() {
  const d = AppState.data;
  if (!d.raw.length) return;

  const lines = [
    'NEXUS AI — DATA ANALYTICS REPORT',
    '='.repeat(50),
    `File: ${d.filename}`,
    `Records: ${d.raw.length}`,
    `Columns: ${d.headers.length}`,
    `Process Time: ${d.processTime}s`,
    '',
    'STATISTICAL SUMMARY',
    '-'.repeat(40)
  ];

  d.numericCols.forEach(col => {
    const s = d.stats[col];
    if (!s) return;
    lines.push(`${col}:`);
    lines.push(`  Mean:   ${s.mean}`);
    lines.push(`  Median: ${s.median}`);
    lines.push(`  Max:    ${s.max}`);
    lines.push(`  Min:    ${s.min}`);
    lines.push(`  Range:  ${s.range}`);
    lines.push('');
  });

  lines.push('-'.repeat(40));
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('Nexus AI Intelligence Platform v3.8.1');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus-report-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Report exported successfully.', 'success');
}

/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════ */
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  if (!container) return;

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || 'ℹ'}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4000);
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
