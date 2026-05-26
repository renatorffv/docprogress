const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const DOCS_DIR = path.join(__dirname, "..", "docs");

function saveProject(projectId, files, name) {
  const projectDir = path.join(UPLOADS_DIR, projectId);
  fs.mkdirSync(projectDir, { recursive: true });

  const manifest = {
    id: projectId,
    name: name || null,
    createdAt: new Date().toISOString(),
    files: [],
  };

  for (const file of files) {
    const filePath = path.join(projectDir, file.originalname);
    fs.copyFileSync(file.path, filePath);
    manifest.files.push({
      name: file.originalname,
      size: file.size,
      path: filePath,
    });
    fs.unlinkSync(file.path);
  }

  fs.writeFileSync(
    path.join(projectDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

function saveDocumentation(projectId, fileName, markdown) {
  const docDir = path.join(DOCS_DIR, projectId);
  fs.mkdirSync(docDir, { recursive: true });

  const safeFileName = fileName.replace(/\.[^.]+$/, "") + ".md";
  const docPath = path.join(docDir, safeFileName);
  fs.writeFileSync(docPath, markdown);

  return { path: docPath, fileName: safeFileName };
}

function getProject(projectId) {
  const manifestPath = path.join(UPLOADS_DIR, projectId, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

function getProjectFiles(projectId) {
  const manifest = getProject(projectId);
  if (!manifest) return null;

  return manifest.files.map((f) => ({
    name: f.name,
    content: fs.readFileSync(f.path, "utf-8"),
  }));
}

function getDocumentation(projectId) {
  const docDir = path.join(DOCS_DIR, projectId);
  if (!fs.existsSync(docDir)) return [];

  return fs
    .readdirSync(docDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      fileName: f,
      content: fs.readFileSync(path.join(docDir, f), "utf-8"),
    }));
}

function listProjects() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];

  return fs
    .readdirSync(UPLOADS_DIR)
    .filter((dir) =>
      fs.existsSync(path.join(UPLOADS_DIR, dir, "manifest.json"))
    )
    .map((dir) => {
      const manifest = getProject(dir);
      const docs = getDocumentation(dir);
      return {
        ...manifest,
        documented: docs.length > 0,
        docsCount: docs.length,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renameProject(projectId, name) {
  const manifestPath = path.join(UPLOADS_DIR, projectId, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  manifest.name = name || null;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

module.exports = {
  saveProject,
  saveDocumentation,
  getProject,
  getProjectFiles,
  getDocumentation,
  listProjects,
  renameProject,
};
