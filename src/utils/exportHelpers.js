/**
 * Export utilities for charts, data, and reports
 */

/**
 * Export chart as PNG image
 * @param {HTMLElement} element - The element to capture
 * @param {string} filename - Output filename
 */
export async function exportToPNG(element, filename = 'chart.png') {
  try {
    // Dynamic import html2canvas
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      backgroundColor: '#030712',
      scale: 2, // Higher resolution
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return true;
  } catch (error) {
    console.error('Failed to export PNG:', error);
    // Fallback: Alert user
    alert('PNG export requires the html2canvas library. Please install it with: npm install html2canvas');
    return false;
  }
}

/**
 * Export data as CSV file
 * @param {Array} data - Chart data array
 * @param {object} params - Simulation parameters
 * @param {string} filename - Output filename
 */
export function exportToCSV(data, params, filename = 'options-data.csv') {
  const headers = ['Price', 'Stock P&L', 'Option P&L', 'Probability %'];

  const metadata = [
    '# Stock vs Options Simulator Export',
    `# Generated: ${new Date().toISOString()}`,
    '# Parameters:',
    `# Current Price: $${params.currentPrice}`,
    `# Strike Price: $${params.strikePrice}`,
    `# Days to Expiry: ${params.daysToExpiry}`,
    `# Implied Volatility: ${params.impliedVol}%`,
    `# Risk-Free Rate: ${params.riskFreeRate}%`,
    `# Investment Amount: $${params.investmentAmount}`,
    `# Option Type: ${params.isCall ? 'Call' : 'Put'}`,
    '',
  ];

  const rows = data.map((row) =>
    [row.price, row.stockPL, row.optionPL, row.probability].join(',')
  );

  const csv = [...metadata, headers.join(','), ...rows].join('\n');

  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export full report as PDF
 * @param {object} reportData - All report data
 * @param {string} filename - Output filename
 */
export async function exportToPDF(reportData, filename = 'options-report.pdf') {
  try {
    // Dynamic import jspdf
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const { params, stats, greeks } = reportData;

    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('Stock vs Options Analysis Report', 20, y);
    y += 15;

    // Timestamp
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175); // Gray
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    y += 15;

    // Parameters section
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Parameters', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    const paramLines = [
      `Stock Price: $${params.currentPrice}`,
      `Strike Price: $${params.strikePrice}`,
      `Days to Expiry: ${params.daysToExpiry}`,
      `Implied Volatility: ${params.impliedVol}%`,
      `Risk-Free Rate: ${params.riskFreeRate}%`,
      `Investment: $${params.investmentAmount}`,
      `Option Type: ${params.isCall ? 'Call' : 'Put'}`,
    ];
    paramLines.forEach((line) => {
      doc.text(line, 25, y);
      y += 6;
    });
    y += 10;

    // Statistics section
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Risk/Reward Analysis', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    const statLines = [
      `Stock Expected Value: ${formatCurrencyPDF(stats.stockEV)}`,
      `Option Expected Value: ${formatCurrencyPDF(stats.optionEV)}`,
      `Stock Win Probability: ${stats.stockWinProb}%`,
      `Option Win Probability: ${stats.optionProfitProb}%`,
      `Option Breakeven: $${stats.breakeven}`,
      `Stock VaR (95%): ${formatCurrencyPDF(stats.stockVaR95)}`,
      `Option VaR (95%): ${formatCurrencyPDF(stats.optionVaR95)}`,
    ];
    statLines.forEach((line) => {
      doc.text(line, 25, y);
      y += 6;
    });
    y += 10;

    // Greeks section
    if (greeks) {
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('Option Greeks', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(209, 213, 219);
      const greekLines = [
        `Delta: ${greeks.delta.toFixed(4)}`,
        `Gamma: ${greeks.gamma.toFixed(4)}`,
        `Theta: $${greeks.theta.toFixed(2)}/day`,
        `Vega: $${greeks.vega.toFixed(2)}/1%`,
        `Rho: $${greeks.rho.toFixed(2)}/1%`,
      ];
      greekLines.forEach((line) => {
        doc.text(line, 25, y);
        y += 6;
      });
    }

    // Save
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('PDF export requires the jspdf library. Please install it with: npm install jspdf');
    return false;
  }
}

/**
 * Generate shareable URL with encoded parameters.
 *
 * Skips fields that aren't finite (so a NaN currentPrice doesn't get
 * URL-encoded as "s=NaN" and silently flatten the recipient's view to a
 * default). Includes positions and userExpectedMove so a "short put with
 * custom move" share doesn't lose those bits on the receiving end.
 */
export function generateShareableURL(params) {
  const out = new URLSearchParams();
  const put = (k, v) => { if (Number.isFinite(v)) out.set(k, String(v)); };

  put('s', params.currentPrice);
  put('k', params.strikePrice);
  put('d', params.daysToExpiry);
  put('iv', params.impliedVol);
  put('r', params.riskFreeRate);
  put('amt', params.investmentAmount);
  out.set('type', params.isCall ? 'call' : 'put');
  if (params.symbol) {
    // Sanitize the symbol to a safe charset so we don't echo user-controlled
    // text into the share URL or the eventual download filename.
    const safeSymbol = String(params.symbol).toUpperCase().replace(/[^A-Z0-9.\-^]/g, '').slice(0, 12);
    if (safeSymbol) out.set('sym', safeSymbol);
  }
  if (params.stockPosition === 'short') out.set('sp', 'short');
  if (params.optionPosition === 'short') out.set('op', 'short');
  if (Number.isFinite(params.userExpectedMove)) put('uem', params.userExpectedMove);
  out.set('v', '2');

  return `${window.location.origin}${window.location.pathname}?${out.toString()}`;
}

/**
 * Parse URL parameters to restore state.
 *
 * Each `pickFinite` call rejects non-finite values, including the literal
 * string "NaN" that the previous version would happily Number-coerce and
 * then `||`-fallback away — so corrupted shares come out as the explicit
 * default, not silently overwritten with `100`.
 */
export function parseURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('s')) return null;

  const pickFinite = (key, fallback) => {
    const n = Number(urlParams.get(key));
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    currentPrice: pickFinite('s', 100),
    strikePrice: pickFinite('k', 105),
    daysToExpiry: pickFinite('d', 30),
    impliedVol: pickFinite('iv', 30),
    riskFreeRate: pickFinite('r', 5),
    investmentAmount: pickFinite('amt', 10000),
    // Explicit "call"/"put" check so a missing/garbage value doesn't silently
    // become "isCall=true" — the caller can then decide whether to keep its
    // own default isCall instead.
    isCall: urlParams.get('type') === 'call' ? true
      : urlParams.get('type') === 'put' ? false
      : true,
    symbol: (urlParams.get('sym') || '').toUpperCase().replace(/[^A-Z0-9.\-^]/g, '').slice(0, 12) || null,
    stockPosition: urlParams.get('sp') === 'short' ? 'short' : 'long',
    optionPosition: urlParams.get('op') === 'short' ? 'short' : 'long',
    userExpectedMove: urlParams.has('uem') ? pickFinite('uem', null) : null,
  };
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareableURL(params) {
  const url = generateShareableURL(params);
  await navigator.clipboard.writeText(url);
  return url;
}

/**
 * Helper to download a file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Format currency for PDF (simpler format)
 */
function formatCurrencyPDF(val) {
  if (val >= 0) return `+$${Math.abs(val).toLocaleString()}`;
  return `-$${Math.abs(val).toLocaleString()}`;
}

/**
 * Export configuration as JSON
 */
export function exportConfig(params, filename = 'simulation-config.json') {
  const config = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    parameters: params,
  };

  downloadFile(JSON.stringify(config, null, 2), filename, 'application/json');
}

/**
 * Import configuration from JSON
 */
export function importConfig(jsonString) {
  try {
    const config = JSON.parse(jsonString);
    if (config.parameters) {
      return config.parameters;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse config:', error);
    return null;
  }
}
