const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true, uppercase: true, ref: "Card" },
    balance: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Wallet", walletSchema);
