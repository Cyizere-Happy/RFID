const express = require("express");
const router = express.Router();

module.exports = (controller) => {
  router.post("/topup", controller.topup);
  return router;
};
