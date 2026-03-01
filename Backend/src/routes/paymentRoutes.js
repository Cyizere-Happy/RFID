const express = require("express");

module.exports = (controller) => {
    const router = express.Router();

    router.post("/", (req, res) => controller.pay(req, res));

    return router;
};
