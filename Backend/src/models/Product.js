const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: "General" },
  image: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
