const express = require("express");
const { getTraining, saveTraining, resetTraining, buildSystemPrompt } = require("../services/training");

const router = express.Router();

router.get("/", (req, res) => {
  const training = getTraining();
  res.json(training);
});

router.put("/", (req, res) => {
  try {
    const saved = saveTraining(req.body);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset", (req, res) => {
  const training = resetTraining();
  res.json(training);
});

router.get("/preview", (req, res) => {
  const prompt = buildSystemPrompt();
  res.json({ prompt });
});

module.exports = router;
