const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "..", "docs", "settings.json");

function getSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  }
  return { companyName: "", logoBase64: null };
}

function saveSettings(data) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const settings = {
    companyName: data.companyName || "",
    logoBase64: data.logoBase64 || null,
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

module.exports = { getSettings, saveSettings };
