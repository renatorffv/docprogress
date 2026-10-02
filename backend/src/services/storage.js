const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const DOCS_DIR = path.join(__dirname, "..", "docs");

function computeHash(filePath) {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

function saveProject(projectId, files, name, metaMap = {}) {
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
    const lastMod = metaMap[file.originalname];
    manifest.files.push({
      name: file.originalname,
      size: file.size,
      path: filePath,
      contentHash: computeHash(filePath),
      uploadedAt: new Date().toISOString(),
      fileModifiedAt: lastMod ? new Date(lastMod).toISOString() : null,
      needsRedoc: false,
      changedAt: null,
    });
    fs.unlinkSync(file.path);
  }

  fs.writeFileSync(
    path.join(projectDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

// Atualiza fontes existentes e adiciona novos. Retorna { added, changed, affected }
function updateProjectFiles(projectId, newFiles, metaMap = {}) {
  const manifest = getProject(projectId);
  if (!manifest) throw new Error("Projeto não encontrado");

  const projectDir = path.join(UPLOADS_DIR, projectId);
  const now = new Date().toISOString();
  const added = [];
  const changed = [];

  for (const file of newFiles) {
    const destPath = path.join(projectDir, file.originalname);
    fs.copyFileSync(file.path, destPath);
    const newHash = computeHash(destPath);
    fs.unlinkSync(file.path);

    const lastMod = metaMap[file.originalname];
    const fileModifiedAt = lastMod ? new Date(lastMod).toISOString() : null;

    const existing = manifest.files.find((f) => f.name === file.originalname);
    if (!existing) {
      manifest.files.push({
        name: file.originalname,
        size: file.size,
        path: destPath,
        contentHash: newHash,
        uploadedAt: now,
        fileModifiedAt,
        needsRedoc: true,
        changedAt: now,
      });
      added.push(file.originalname);
    } else if (existing.contentHash !== newHash) {
      existing.size = file.size;
      existing.contentHash = newHash;
      existing.fileModifiedAt = fileModifiedAt;
      existing.needsRedoc = true;
      existing.changedAt = now;
      changed.push(file.originalname);
    }
    // hash igual = sem alteração, ignora
  }

  // Descobrir grupos afetados usando a análise existente
  const analysis = getAnalysis(projectId);
  const affectedGroups = [];
  if (analysis && analysis.groups) {
    const modifiedFiles = new Set([...added, ...changed]);
    for (const group of analysis.groups) {
      const hits = (group.fileNames || group.files || []).filter((fn) => modifiedFiles.has(fn));
      if (hits.length > 0) affectedGroups.push(group.id || group.name);
    }
  }

  manifest.updatedAt = now;
  fs.writeFileSync(
    path.join(projectDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return { added, changed, affectedGroups };
}

// Limpa needsRedoc dos arquivos de um grupo após re-documentar
function clearNeedsRedoc(projectId, fileNames) {
  const manifest = getProject(projectId);
  if (!manifest) return;
  for (const file of manifest.files) {
    if (fileNames.includes(file.name)) {
      file.needsRedoc = false;
      file.changedAt = null;
    }
  }
  fs.writeFileSync(
    path.join(UPLOADS_DIR, projectId, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
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
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  // Projetos antigos não têm uploadedAt — preenche com mtime do arquivo
  for (const file of manifest.files) {
    if (!file.uploadedAt && file.path) {
      try {
        file.uploadedAt = fs.statSync(file.path).mtime.toISOString();
      } catch { /* arquivo pode não existir mais */ }
    }
  }
  return manifest;
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

function saveAnalysis(projectId, groups) {
  const docDir = path.join(DOCS_DIR, projectId);
  fs.mkdirSync(docDir, { recursive: true });
  const data = { analyzedAt: new Date().toISOString(), groups };
  fs.writeFileSync(path.join(docDir, "_analysis.json"), JSON.stringify(data, null, 2));
  return data;
}

function getAnalysis(projectId) {
  const filePath = path.join(DOCS_DIR, projectId, "_analysis.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

module.exports = {
  saveProject,
  updateProjectFiles,
  clearNeedsRedoc,
  saveDocumentation,
  getProject,
  getProjectFiles,
  getDocumentation,
  listProjects,
  renameProject,
  saveAnalysis,
  getAnalysis,
};
