const express = require("express");

module.exports = (controller) => {
  const router = express.Router();
  router.post("/topup", (req, res) => controller.topup(req, res));
  return router;
};

