const express = require("express");
const { listProjects, getProject, getProjectFiles, renameProject, saveProjectDescription, saveProjectLogo } = require("../services/storage");

const router = express.Router();

router.get("/", (req, res) => {
  const projects = listProjects();
  res.json({ projects });
});

router.get("/:id", (req, res) => {
  const project = getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }
  res.json(project);
});

router.get("/:id/files", (req, res) => {
  const files = getProjectFiles(req.params.id);
  if (!files) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }
  res.json({
    files: files.map((f) => ({
      name: f.name,
      content: f.content,
      lines: f.content.split("\n").length,
    })),
  });
});

router.patch("/:id/name", (req, res) => {
  const { name } = req.body;
  const manifest = renameProject(req.params.id, typeof name === "string" ? name.trim() : null);
  if (!manifest) return res.status(404).json({ error: "Projeto não encontrado" });
  res.json({ id: manifest.id, name: manifest.name });
});

router.patch("/:id/description", (req, res) => {
  const { description } = req.body;
  const manifest = saveProjectDescription(req.params.id, typeof description === "string" ? description.trim() : null);
  if (!manifest) return res.status(404).json({ error: "Projeto não encontrado" });
  res.json({ id: manifest.id, description: manifest.description });
});

router.patch("/:id/logo", (req, res) => {
  const { logoBase64 } = req.body;
  const manifest = saveProjectLogo(req.params.id, logoBase64 || null);
  if (!manifest) return res.status(404).json({ error: "Projeto não encontrado" });
  res.json({ id: manifest.id, hasLogo: !!manifest.logoBase64 });
});

module.exports = router;
