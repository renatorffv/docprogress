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
    if (allowed.includes(ext) || /^\.i\d+$/.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Extensão ${ext} não permitida. Use: .p, .w, .i, .i1~.iN, .cls, .t, .r`));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", (req, res) => {
  upload.array("files", 1000)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const projectId = uuidv4();
      const name = typeof req.body.name === "string" ? req.body.name.trim() : null;
      const manifest = saveProject(projectId, req.files, name || null);

      res.json({
        projectId,
        filesCount: manifest.files.length,
        files: manifest.files.map((f) => ({ name: f.name, size: f.size })),
      });
    } catch (saveErr) {
      res.status(500).json({ error: saveErr.message });
    }
  });
});

module.exports = router;
