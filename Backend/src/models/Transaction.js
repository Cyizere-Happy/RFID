const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  uid: { type: String, required: true, uppercase: true, ref: "Card" },
  type: { type: String, enum: ["TOPUP", "PAYMENT"], required: true },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  quantity: { type: Number, default: null },
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
