const puppeteer = require("puppeteer-core");
const { marked } = require("marked");
const fs = require("fs");

// ── Locate system Chrome / Edge (Windows + Linux) ───────────────────────────
function findBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    // Linux (VPS / servidor) — apt antes do snap (snap não funciona headless)
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/local/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // keep trying
    }
  }
  return null;
}

// ── Build full HTML page (mirrors PrintContent.tsx) ─────────────────────────
function buildHtml(markdownContent, title, settings) {
  const bodyHtml = marked.parse(markdownContent, { gfm: true, breaks: false });

  const { logoBase64, configLogoBase64, companyName, projectName } = settings || {};
  const displayName = projectName || companyName || "";

  const leftLogoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="max-height:64px;max-width:200px;object-fit:contain;">`
    : "";
  const displayNameHtml = displayName
    ? `<span style="font-size:20px;font-weight:700;color:#1f2937;">${escHtml(displayName)}</span>`
    : "";
  const rightLogoHtml = configLogoBase64
    ? `<img src="${configLogoBase64}" alt="Logo Config" style="max-height:56px;max-width:180px;object-fit:contain;">`
    : "";

  let headerHtml = "";
  if (leftLogoHtml || displayNameHtml) {
    if (rightLogoHtml) {
      headerHtml = `<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;margin-bottom:32px;border-bottom:2px solid #1f2937;">
        <div style="display:flex;align-items:center;gap:16px;">${leftLogoHtml}${displayNameHtml}</div>
        <div>${rightLogoHtml}</div>
      </div>`;
    } else {
      headerHtml = `<div style="display:flex;align-items:center;gap:20px;padding-bottom:24px;margin-bottom:32px;border-bottom:2px solid #1f2937;">
        ${leftLogoHtml}${displayNameHtml}
      </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.65;
    color: #111827;
    background: #fff;
    margin: 0;
    padding: 0 60px 60px;
  }

  /* ── Typography ── */
  h1 { font-size: 1.75em; font-weight: 700; color: #111827; margin: 1.4em 0 0.5em; padding-bottom: 0.3em; border-bottom: 1px solid #e5e7eb; }
  h2 { font-size: 1.35em; font-weight: 700; color: #111827; margin: 1.3em 0 0.45em; }
  h3 { font-size: 1.15em; font-weight: 700; color: #111827; margin: 1.2em 0 0.4em; }
  h4, h5, h6 { font-size: 1em; font-weight: 700; color: #374151; margin: 1em 0 0.35em; }
  p { margin: 0.7em 0; }
  a { color: #2563eb; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
  blockquote { border-left: 4px solid #e5e7eb; margin: 1em 0; padding: 0.3em 1em; color: #6b7280; }

  /* ── Code ── */
  pre {
    background: #f3f4f6;
    border-radius: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    font-size: 11.5px;
    line-height: 1.55;
    margin: 1em 0;
  }
  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11.5px;
  }
  p code, li code, td code, th code {
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
  }
  pre code { background: none; padding: 0; }

  /* ── Lists ── */
  ul, ol { margin: 0.7em 0; padding-left: 1.6em; }
  li { margin: 0.25em 0; }
  li > ul, li > ol { margin: 0.2em 0; }

  /* ── Tables (GFM) ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 12px;
    table-layout: auto;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    text-align: left;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    vertical-align: top;
    white-space: nowrap;
  }
  td {
    padding: 7px 12px;
    border: 1px solid #d1d5db;
    vertical-align: top;
    word-break: break-word;
  }
  tr:nth-child(even) td { background: #f9fafb; }

</style>
</head>
<body>
  ${headerHtml}
  <div class="prose">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Opções de PDF com rodapé nativo em todas as páginas (inclui contador de páginas)
function buildPdfOptions() {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const footerTemplate = `
    <div style="width:100%;font-size:10px;color:#9ca3af;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
      display:flex;justify-content:space-between;align-items:center;
      padding:0 60px;box-sizing:border-box;">
      <span>Elaborado por DKP Consultoria e Tecnologia &mdash; dkp-it.com.br</span>
      <span>Gerado em ${date}&nbsp;&nbsp;<span class="pageNumber"></span>/<span class="totalPages"></span></span>
    </div>`;
  return {
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate,
    margin: { top: "20mm", bottom: "12mm", left: "0mm", right: "0mm" },
  };
}

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--single-process",
];

// ── Public API ───────────────────────────────────────────────────────────────
async function markdownToPdf(content, title, settings) {
  const executablePath = findBrowserPath();
  if (!executablePath) {
    throw new Error(
      "Chrome ou Edge não encontrado. Instale o Google Chrome ou defina a variável CHROME_PATH."
    );
  }

  const html = buildHtml(content, title, settings);
  const browser = await puppeteer.launch({ executablePath, headless: true, args: LAUNCH_ARGS });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf(buildPdfOptions());
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Gera múltiplos PDFs reusando um único browser — muito mais rápido para lotes
async function markdownToPdfBatch(items, settings) {
  const executablePath = findBrowserPath();
  if (!executablePath) {
    throw new Error(
      "Chrome ou Edge não encontrado. Instale o Google Chrome ou defina a variável CHROME_PATH."
    );
  }

  const browser = await puppeteer.launch({ executablePath, headless: true, args: LAUNCH_ARGS });
  const results = [];

  try {
    for (const { content, title } of items) {
      const html = buildHtml(content, title, settings);
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf(buildPdfOptions());
        results.push({ title, buffer: Buffer.from(pdf) });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

module.exports = { markdownToPdf, markdownToPdfBatch };
