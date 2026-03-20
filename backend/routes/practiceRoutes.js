const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const practiceController = require("../controllers/practiceController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/extract-topics",
  authMiddleware,
  upload.single("file"),
  practiceController.extractTopics
);

router.post(
  "/generate",
  authMiddleware,
  practiceController.generatePractice
);

module.exports = router;
