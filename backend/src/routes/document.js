const express = require("express");
const { documentCode, documentProject } = require("../services/ai");
const {
  getProjectFiles,
  saveDocumentation,
  getDocumentation,
} = require("../services/storage");

const router = express.Router();

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

// Documentar o projeto inteiro
router.post("/project", async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId é obrigatório" });
    }

    const files = getProjectFiles(projectId);
    if (!files) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const markdown = await documentProject(files);
    const doc = saveDocumentation(projectId, "_projeto", markdown);

    res.json({ fileName: doc.fileName, documentation: markdown });
  } catch (err) {
    console.error("Erro ao documentar projeto:", err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar documentação existente
router.get("/:projectId", (req, res) => {
  const docs = getDocumentation(req.params.projectId);
  res.json({ docs });
});

module.exports = router;
