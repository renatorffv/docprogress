const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "docprogress-dev-secret";

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado. Faça login novamente." });
  }
}

module.exports = { requireAuth, JWT_SECRET };
