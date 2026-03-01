const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, default: "Unknown Card" }
}, { timestamps: true });

module.exports = mongoose.model("Card", cardSchema);
