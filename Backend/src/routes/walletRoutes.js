const express = require("express");

module.exports = (controller) => {
    const router = express.Router();

    router.get("/", (req, res) => controller.getAll(req, res));
    router.get("/:uid", (req, res) => controller.getByUid(req, res));

    return router;
};
