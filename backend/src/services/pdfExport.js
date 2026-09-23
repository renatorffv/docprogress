const puppeteer = require("puppeteer-core");
const { marked } = require("marked");
const fs = require("fs");

// ── Locate system Chrome / Edge (Windows + Linux) ───────────────────────────
function findBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    // Linux (VPS / servidor)
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/usr/local/bin/chromium",
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

  const logoHtml =
    settings?.logoBase64
      ? `<img src="${settings.logoBase64}" alt="Logo" style="max-height:64px;max-width:200px;object-fit:contain;">`
      : "";

  const companyHtml =
    settings?.companyName
      ? `<span style="font-size:20px;font-weight:700;color:#1f2937;">${escHtml(settings.companyName)}</span>`
      : "";

  const headerHtml =
    logoHtml || companyHtml
      ? `<div style="display:flex;align-items:center;gap:20px;padding-bottom:24px;margin-bottom:32px;border-bottom:2px solid #1f2937;">
           ${logoHtml}${companyHtml}
         </div>`
      : "";

  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

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

  /* ── Footer ── */
  .doc-footer {
    margin-top: 48px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #9ca3af;
  }
</style>
</head>
<body>
  ${headerHtml}
  <div class="prose">
    ${bodyHtml}
  </div>
  <div class="doc-footer">
    <span>${escHtml(title)}</span>
    <span>Gerado em ${date}</span>
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

// ── Public API ───────────────────────────────────────────────────────────────
async function markdownToPdf(content, title, settings) {
  const executablePath = findBrowserPath();
  if (!executablePath) {
    throw new Error(
      "Chrome ou Edge não encontrado. Instale o Google Chrome ou defina a variável CHROME_PATH."
    );
  }

  const html = buildHtml(content, title, settings);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--single-process",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "0mm", right: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = { markdownToPdf };
