const express = require("express");
const router = express.Router();
const { getUsers, deleteUser } = require("../services/users");

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

module.exports = router;
