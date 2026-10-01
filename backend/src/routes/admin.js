const express = require("express");
const router = express.Router();
const { getUsers, deleteUser, resetPassword } = require("../services/users");

// GET /api/admin/users — lista todos os usuários (sem senha)
router.get("/users", (req, res) => {
  const users = getUsers().map(({ id, name, email, createdAt }) => ({
    id, name, email, createdAt,
  }));
  res.json({ users });
});

// DELETE /api/admin/users/:id — remove um usuário
router.delete("/users/:id", (req, res) => {
  try {
    deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/reset-password — gera senha temporária
router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }
    await resetPassword(req.params.id, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
