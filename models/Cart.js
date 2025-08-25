// models/Cart.js
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // could be Firebase UID or your user _id
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      offerPrice: Number,
      quantity: { type: Number, default: 1 },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema, "carts");
