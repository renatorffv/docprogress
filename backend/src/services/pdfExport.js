const PDFDocument = require("pdfkit");
const { marked } = require("marked");

const FONT_NORMAL = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_MONO = "Courier";
const MARGIN = 55;
const TEXT_WIDTH = 595 - MARGIN * 2; // A4 width minus margins

function stripInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function renderTokens(doc, tokens) {
  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const sizes = [22, 18, 15, 13, 12, 11];
        const size = sizes[token.depth - 1] ?? 12;
        if (token.depth === 1) doc.moveDown(0.4);
        doc
          .fontSize(size)
          .font(FONT_BOLD)
          .fillColor("#1a1a2e")
          .text(stripInline(token.text), { width: TEXT_WIDTH, lineGap: 2 });
        doc.moveDown(token.depth === 1 ? 0.5 : 0.3);
        doc.fillColor("#000000");
        break;
      }
      case "paragraph": {
        doc
          .fontSize(10)
          .font(FONT_NORMAL)
          .fillColor("#222222")
          .text(stripInline(token.text), { width: TEXT_WIDTH, lineGap: 3 });
        doc.moveDown(0.5);
        doc.fillColor("#000000");
        break;
      }
      case "code": {
        const lines = token.text.split("\n");
        const codeY = doc.y;
        // Gray background box
        const approxHeight = lines.length * 12 + 16;
        const remainingPage = doc.page.height - doc.page.margins.bottom - codeY;
        if (approxHeight > remainingPage && remainingPage < 80) doc.addPage();
        const boxY = doc.y;
        doc
          .save()
          .rect(MARGIN - 6, boxY, TEXT_WIDTH + 12, approxHeight)
          .fill("#f3f4f6")
          .restore();
        doc
          .fontSize(8)
          .font(FONT_MONO)
          .fillColor("#1f2937")
          .text(token.text, MARGIN, boxY + 8, { width: TEXT_WIDTH, lineGap: 2 });
        doc.moveDown(0.6);
        doc.fillColor("#000000");
        break;
      }
      case "list": {
        for (const item of token.items) {
          const bullet = token.ordered ? `${token.items.indexOf(item) + 1}.` : "•";
          doc
            .fontSize(10)
            .font(FONT_NORMAL)
            .fillColor("#222222")
            .text(`${bullet}  ${stripInline(item.text)}`, {
              width: TEXT_WIDTH - 16,
              indent: 16,
              lineGap: 2,
            });
        }
        doc.moveDown(0.4);
        doc.fillColor("#000000");
        break;
      }
      case "table": {
        const colCount = token.header.length;
        const colWidth = Math.floor(TEXT_WIDTH / colCount);
        // Header row
        doc.font(FONT_BOLD).fontSize(9).fillColor("#1a1a2e");
        let x = MARGIN;
        for (const cell of token.header) {
          doc.text(stripInline(cell.text), x, doc.y, { width: colWidth, lineBreak: false });
          x += colWidth;
        }
        doc.moveDown(0.3);
        doc
          .moveTo(MARGIN, doc.y)
          .lineTo(MARGIN + TEXT_WIDTH, doc.y)
          .strokeColor("#cccccc")
          .stroke();
        doc.moveDown(0.2);
        // Body rows
        doc.font(FONT_NORMAL).fontSize(9).fillColor("#222222");
        for (const row of token.rows) {
          x = MARGIN;
          const rowY = doc.y;
          for (const cell of row) {
            doc.text(stripInline(cell.text), x, rowY, { width: colWidth, lineBreak: false });
            x += colWidth;
          }
          doc.moveDown(0.35);
        }
        doc.moveDown(0.4);
        doc.fillColor("#000000");
        break;
      }
      case "hr": {
        doc.moveDown(0.3);
        doc
          .moveTo(MARGIN, doc.y)
          .lineTo(MARGIN + TEXT_WIDTH, doc.y)
          .strokeColor("#dddddd")
          .stroke();
        doc.moveDown(0.3);
        break;
      }
      case "space":
        doc.moveDown(0.3);
        break;
      default:
        break;
    }
  }
}

async function markdownToPdf(content, title, settings) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      margin: MARGIN,
      size: "A4",
      info: { Title: title, Creator: settings?.companyName || "DocProgress" },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ───────────────────────────────────────────────────────────────
    let headerY = MARGIN - 10;
    let logoWidth = 0;
    if (settings?.logoBase64) {
      try {
        const b64 = settings.logoBase64.includes(",")
          ? settings.logoBase64.split(",")[1]
          : settings.logoBase64;
        const logoBuffer = Buffer.from(b64, "base64");
        logoWidth = 36;
        doc.image(logoBuffer, MARGIN, headerY, { height: logoWidth });
      } catch {
        /* ignore bad logo */
      }
    }
    if (settings?.companyName) {
      doc
        .fontSize(11)
        .font(FONT_BOLD)
        .fillColor("#1a1a2e")
        .text(settings.companyName, MARGIN + logoWidth + 8, headerY + 10, {
          width: TEXT_WIDTH - logoWidth - 8,
        });
    }

    // Separator line
    doc
      .moveTo(MARGIN, headerY + 42)
      .lineTo(MARGIN + TEXT_WIDTH, headerY + 42)
      .strokeColor("#cccccc")
      .stroke();

    doc.y = headerY + 52;

    // ── Title ────────────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font(FONT_BOLD)
      .fillColor("#1a1a2e")
      .text(title.replace(/^_grp_|^_projeto/, ""), { width: TEXT_WIDTH });
    doc.moveDown(0.8);
    doc.fillColor("#000000");

    // ── Body ─────────────────────────────────────────────────────────────────
    const tokens = marked.lexer(content);
    renderTokens(doc, tokens);

    // ── Footer (page number) ─────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - 35;
      doc
        .fontSize(8)
        .font(FONT_NORMAL)
        .fillColor("#999999")
        .text(
          `${title} · Gerado em ${new Date().toLocaleDateString("pt-BR")} · Pág. ${i + 1}/${range.count}`,
          MARGIN,
          footerY,
          { width: TEXT_WIDTH, align: "right" }
        );
    }

    doc.end();
  });
}

module.exports = { markdownToPdf };
