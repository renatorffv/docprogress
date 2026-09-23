const express = require("express");
const jwt = require("jsonwebtoken");
const { createUser, validateUser } = require("../services/users");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
    if (password.length < 6)
      return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    const user = await createUser(name, email, password);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    const user = await validateUser(email, password);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
