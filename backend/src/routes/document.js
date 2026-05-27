const express = require("express");
const { documentCode, documentProject } = require("../services/ai");
const { getProjectFiles, saveDocumentation, getDocumentation } = require("../services/storage");
const { getSettings } = require("../services/settings");
const { markdownToDocx } = require("../services/docxExport");

const router = express.Router();

// Jobs em memória: jobId -> { status, fileName?, documentation?, error?, createdAt }
const jobs = new Map();

// Limpa jobs com mais de 2 horas para não vazar memória
function pruneJobs() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

// Documentar um arquivo específico
router.post("/file", async (req, res) => {
  try {
    const { projectId, fileName } = req.body;

    if (!projectId || !fileName) {
      return res.status(400).json({ error: "projectId e fileName são obrigatórios" });
    }

    const files = getProjectFiles(projectId);
    if (!files) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const file = files.find((f) => f.name === fileName);
    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado no projeto" });
    }

    const markdown = await documentCode(file.content, file.name);
    const doc = saveDocumentation(projectId, file.name, markdown);

    res.json({ fileName: doc.fileName, documentation: markdown });
  } catch (err) {
    console.error("Erro ao documentar arquivo:", err);
    res.status(500).json({ error: err.message });
  }
});

// Inicia documentação do projeto em background e retorna jobId imediatamente
router.post("/project", (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: "projectId é obrigatório" });
  }

  const files = getProjectFiles(projectId);
  if (!files) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  pruneJobs();
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "running", createdAt: Date.now() });

  // Processa em background — não bloqueia a resposta HTTP
  (async () => {
    try {
      console.log(`[job:${jobId}] Iniciando documentação de ${files.length} arquivo(s)...`);
      const markdown = await documentProject(files, ({ percent, message }) => {
        const current = jobs.get(jobId) || {};
        jobs.set(jobId, {
          ...current,
          percent: percent ?? current.percent ?? 0,
          message: message ?? current.message ?? "",
        });
      });
      const doc = saveDocumentation(projectId, "_projeto", markdown);
      jobs.set(jobId, {
        status: "done",
        percent: 100,
        message: "Documentação concluída!",
        fileName: doc.fileName,
        documentation: markdown,
        createdAt: Date.now(),
      });
      console.log(`[job:${jobId}] Concluído.`);
    } catch (err) {
      console.error(`[job:${jobId}] Erro:`, err.message);
      jobs.set(jobId, { status: "error", percent: 0, message: err.message, error: err.message, createdAt: Date.now() });
    }
  })();

  res.json({ jobId });
});

// Consulta status de um job (deve ficar antes de /:projectId para não colidir)
router.get("/project/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job não encontrado" });
  res.json(job);
});

// Download de documentação em formato Word
router.get("/:projectId/export/docx", async (req, res) => {
  const { doc } = req.query;
  if (!doc) return res.status(400).json({ error: "Parâmetro 'doc' obrigatório" });

  const docs = getDocumentation(req.params.projectId);
  const found = docs.find((d) => d.fileName === doc);
  if (!found) return res.status(404).json({ error: "Documento não encontrado" });

  try {
    const settings = getSettings();
    const title = doc.replace(/\.md$/, "");
    const buffer = await markdownToDocx(found.content, title, settings);
    const safeName = title.replace(/[^a-z0-9_\-\s]/gi, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao gerar Word:", err);
    res.status(500).json({ error: "Falha ao gerar arquivo Word: " + err.message });
  }
});

// Buscar documentação existente
router.get("/:projectId", (req, res) => {
  const docs = getDocumentation(req.params.projectId);
  res.json({ docs });
});

module.exports = router;
