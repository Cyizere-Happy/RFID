const express = require("express");

module.exports = (controller) => {
    const router = express.Router();

    router.get("/", (req, res) => controller.getAll(req, res));
    router.get("/:uid", (req, res) => controller.getByUid(req, res));
    router.post("/", (req, res) => controller.create(req, res));
    router.put("/:uid", (req, res) => controller.update(req, res));
    router.delete("/:uid", (req, res) => controller.delete(req, res));

    return router;
};
