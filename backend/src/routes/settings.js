const express = require("express");
const { getSettings, saveSettings } = require("../services/settings");

const router = express.Router();

router.get("/", (req, res) => res.json(getSettings()));

router.put("/", (req, res) => {
  try {
    res.json(saveSettings(req.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
