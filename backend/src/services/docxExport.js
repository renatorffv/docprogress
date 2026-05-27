const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} = require("docx");
const { marked } = require("marked");

const HEADING_MAP = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

// Converte tokens inline do marked em TextRun[]
function inlineToRuns(tokens = [], props = {}) {
  const runs = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "text":
      case "escape":
        runs.push(new TextRun({ text: tok.text ?? tok.raw ?? "", ...props }));
        break;
      case "strong":
        runs.push(...inlineToRuns(tok.tokens, { ...props, bold: true }));
        break;
      case "em":
        runs.push(...inlineToRuns(tok.tokens, { ...props, italics: true }));
        break;
      case "del":
        runs.push(...inlineToRuns(tok.tokens, { ...props, strike: true }));
        break;
      case "codespan":
        runs.push(new TextRun({ text: tok.text, font: "Courier New", size: 18, ...props }));
        break;
      case "link":
        runs.push(new TextRun({ text: tok.text || tok.href, color: "0563C1", underline: {}, ...props }));
        break;
      case "br":
        runs.push(new TextRun({ break: 1 }));
        break;
      default:
        if (tok.raw) runs.push(new TextRun({ text: tok.raw, ...props }));
    }
  }
  return runs;
}

// Converte bloco de tokens do marked em elementos docx
function blocksToParagraphs(tokens) {
  const result = [];

  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        result.push(
          new Paragraph({
            heading: HEADING_MAP[tok.depth - 1] ?? HeadingLevel.HEADING_1,
            children: inlineToRuns(tok.tokens),
            spacing: { before: 280, after: 120 },
          })
        );
        break;
      }

      case "paragraph": {
        result.push(
          new Paragraph({
            children: inlineToRuns(tok.tokens),
            spacing: { after: 160 },
          })
        );
        break;
      }

      case "code": {
        const lines = tok.text.split("\n");
        lines.forEach((line, i) => {
          result.push(
            new Paragraph({
              children: [new TextRun({ text: line || " ", font: "Courier New", size: 18, color: "333333" })],
              shading: { type: ShadingType.CLEAR, fill: "F4F4F4" },
              spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 100 : 0 },
              indent: { left: 360 },
            })
          );
        });
        break;
      }

      case "blockquote": {
        for (const inner of blocksToParagraphs(tok.tokens)) {
          result.push(inner);
        }
        break;
      }

      case "list": {
        for (const item of tok.items) {
          const runs = [];
          for (const t of item.tokens) {
            if (t.type === "text") {
              runs.push(...inlineToRuns(t.tokens?.length ? t.tokens : [{ type: "text", text: t.text }]));
            } else if (t.type === "paragraph") {
              runs.push(...inlineToRuns(t.tokens));
            }
          }
          result.push(
            new Paragraph({
              children: runs,
              bullet: !tok.ordered ? { level: 0 } : undefined,
              numbering: tok.ordered ? { reference: "numbered", level: 0 } : undefined,
              spacing: { after: 80 },
            })
          );
        }
        break;
      }

      case "table": {
        const rows = [];
        // Header
        rows.push(
          new TableRow({
            tableHeader: true,
            children: tok.header.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: inlineToRuns(cell.tokens, { bold: true }),
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: "D8E4F0" },
                })
            ),
          })
        );
        // Body
        for (const row of tok.rows) {
          rows.push(
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: inlineToRuns(cell.tokens) })],
                  })
              ),
            })
          );
        }
        result.push(
          new Table({
            rows,
            width: { size: 9000, type: WidthType.DXA },
          })
        );
        result.push(new Paragraph({ children: [], spacing: { after: 160 } }));
        break;
      }

      case "hr": {
        result.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA" } },
            spacing: { before: 160, after: 160 },
          })
        );
        break;
      }

      case "space":
        result.push(new Paragraph({ children: [], spacing: { after: 80 } }));
        break;

      default:
        break;
    }
  }

  return result;
}

async function markdownToDocx(content, title, settings = {}) {
  const { companyName, logoBase64 } = settings;

  // Cabeçalho: logo + nome da empresa
  const headerChildren = [];

  if (logoBase64) {
    try {
      const base64Data = logoBase64.includes(",") ? logoBase64.split(",")[1] : logoBase64;
      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: Buffer.from(base64Data, "base64"),
              transformation: { width: 120, height: 40 },
              floating: undefined,
            }),
          ],
          spacing: { after: 60 },
        })
      );
    } catch {
      // ignora erros de imagem
    }
  }

  if (companyName) {
    headerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: companyName, bold: true, size: 26, color: "222222" })],
        spacing: { after: 80 },
      })
    );
  }

  // Separador após cabeçalho
  if (headerChildren.length > 0) {
    headerChildren.push(
      new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "333333" } },
        spacing: { after: 240 },
      })
    );
  }

  // Título do documento
  headerChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
      spacing: { after: 240 },
    })
  );

  // Conteúdo
  const tokens = marked.lexer(content);
  const contentParagraphs = blocksToParagraphs(tokens);

  // Rodapé com data
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${title}  ·  Gerado em ${today}`, size: 16, color: "888888" }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
              }),
            ],
          }),
        },
        children: [...headerChildren, ...contentParagraphs],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { markdownToDocx };
