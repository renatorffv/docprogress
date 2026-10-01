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
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const { requireAuth } = require("./middleware/auth");

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

// Rotas públicas (sem autenticação)
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);

// Todas as demais rotas exigem token JWT
app.use(requireAuth);

// Troca de senha do usuário logado
const { changePassword } = require("./services/users");
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    await changePassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use("/api/upload", uploadRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
