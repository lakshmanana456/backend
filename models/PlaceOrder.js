const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      offerPrice: Number,
      quantity: Number,
    },
  ],
  total: { type: Number, required: true },
  deliveryInfo: {
    firstName: String,
    lastName: String,
    email: String,
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
    phone: String,
  },
  paymentMethod: { type: String, default: "Cash on Delivery" },
  status: { type: String, default: "Pending" }, // Pending, Shipped, Delivered
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PlaceOrder", orderSchema);
