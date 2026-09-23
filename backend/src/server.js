require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const uploadRoutes = require("./routes/upload");
const documentRoutes = require("./routes/document");
const projectRoutes = require("./routes/project");
const trainingRoutes = require("./routes/training");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "50mb" }));

// Garantir que os diretórios existam
const uploadsDir = path.join(__dirname, "uploads");
const docsDir = path.join(__dirname, "docs");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

app.use("/api/upload", uploadRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
