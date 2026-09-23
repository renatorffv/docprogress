const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_FILE = path.join(__dirname, "..", "docs", "users.json");

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

async function createUser(name, email, password) {
  const users = getUsers();
  if (findByEmail(email)) throw new Error("E-mail já cadastrado");
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    password: hash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return { id: user.id, name: user.name, email: user.email };
}

async function validateUser(email, password) {
  const user = findByEmail(email);
  if (!user) throw new Error("E-mail ou senha incorretos");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("E-mail ou senha incorretos");
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { createUser, validateUser, findByEmail };
