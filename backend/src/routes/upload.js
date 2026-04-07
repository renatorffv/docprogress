const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { saveProject } = require("../services/storage");

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, "..", "uploads", "tmp"),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".p", ".w", ".i", ".cls", ".t", ".r"];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Extensão ${ext} não permitida. Use: ${allowed.join(", ")}`));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", upload.array("files", 100), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const projectId = uuidv4();
    const manifest = saveProject(projectId, req.files);

    res.json({
      projectId,
      filesCount: manifest.files.length,
      files: manifest.files.map((f) => ({ name: f.name, size: f.size })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
