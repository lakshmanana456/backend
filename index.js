const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
  console.log("server started on 5000");
});

mongoose
  .connect(
    "mongodb+srv://elakshmanan10501:123@cluster0.eerqtou.mongodb.net/products?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("db connected"))
  .catch(() => console.log("failed to connect db"));

//  Schema stores image as binary (Buffer) + content type
const productSchema = new mongoose.Schema({
  category: String,
  name: String,
  storage: String,
  originalPrice: Number,
  offerPrice: Number,
  rating: String,
  ratingCount: String,
  description: String,
  bestseller: { type: Boolean, default: false },
  imageUrl: String,   //  only store path
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema, "products");

const path = require("path");
const fs = require("fs");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

//  serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // backend/uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

//  create multer instance
const upload = multer({ storage });

//  Add product with image
app.post("/addproduct", upload.single("imgFile"), async (req, res) => {
  try {
    const {
      category,
      name,
      storage,
      originalPrice,
      offerPrice,
      rating,
      ratingCount,
      description,
      bestseller,
    } = req.body;

    const cleanOriginalPrice = Number(String(originalPrice).replace(/,/g, ""));
    const cleanOfferPrice = Number(String(offerPrice).replace(/,/g, ""));

    const newProduct = new Product({
      category,
      name,
      storage,
      originalPrice: cleanOriginalPrice,
      offerPrice: cleanOfferPrice,
      rating,
      ratingCount,
      description,
      bestseller: bestseller === "true",
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null, //url
    });

    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    res.status(500).send("error saving product: " + err.message);
  }
});


//  Get all products
app.get("/productlist", async (req, res) => {
  try {
    const data = await Product.find();
    res.send(data);
  } catch (err) {
    console.error("failed to get products", err);
    res.status(500).send("error retrieving products");
  }
});

///  Serve product image by ID (redirects to static file instead of sending binary)
app.get("/product/image/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.imageUrl) {
      return res.status(404).send("No image found");
    }

    // Redirect the client to the actual static file
    res.redirect(`http://localhost:5000${product.imageUrl}`);
  } catch (err) {
    res.status(500).send("error fetching image");
  }
});


app.put("/updateproduct/:id", upload.single("imgFile"), async (req, res) => {
  try {
    const updateData = {
      category: req.body.category,
      name: req.body.name,
      storage: req.body.storage,
      originalPrice: req.body.originalPrice,
      offerPrice: req.body.offerPrice,
      rating: req.body.rating,
      ratingCount: req.body.ratingCount,
      description: req.body.description,
      // bestseller: req.body.bestseller,
      bestseller: String(req.body.bestseller) === "true",

      // bestseller: req.body.bestseller == true, //;losely check

    };

    // If new image uploaded, update path
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Error updating product");
  }
});


app.delete("/deleteproduct/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// fetch single product details
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.json(product);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
//

const Cart = require("./models/Cart"); // import the schema

//  Get user cart
app.get("/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.productId");
    if (!cart) return res.json({ items: [] });
    res.json(cart);
  } catch (err) {
    res.status(500).send("Error fetching cart");
  }
});

//  Add item to cart
app.post("/cart/:userId/add", async (req, res) => {
  try {
    const { productId, name, offerPrice } = req.body;
    let cart = await Cart.findOne({ userId: req.params.userId });

    if (!cart) {
      cart = new Cart({ userId: req.params.userId, items: [] });
    }

    const existing = cart.items.find((item) => item.productId.toString() === productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.items.push({ productId, name, offerPrice, quantity: 1 });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send("Error adding to cart");
  }
});

//  Update quantity
app.put("/cart/:userId/update", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.params.userId });

    if (!cart) return res.status(404).send("Cart not found");

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) return res.status(404).send("Item not found");

    item.quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send("Error updating cart");
  }
});

//  Remove item
app.delete("/cart/:userId/remove/:productId", async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).send("Cart not found");

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send("Error removing from cart");
  }
});

// Clear entire cart
app.delete("/cart/:userId/clear", async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.params.userId });
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    res.status(500).send("Error clearing cart");
  }
});


//
const PlaceOrder = require("./models/PlaceOrder");

app.post("/order/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { deliveryInfo, paymentMethod } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Create new order
    const newOrder = new PlaceOrder({
      userId,
      items: cart.items,
      total: cart.items.reduce((acc, item) => acc + item.offerPrice * item.quantity, 0),
      deliveryInfo,
      paymentMethod: paymentMethod || "Cash on Delivery",
    });

    await newOrder.save();

    // Clear cart after placing order
    await Cart.findOneAndDelete({ userId });

    res.json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error placing order" });
  }
});

//  Get all orders for a user
app.get("/orders/:userId", async (req, res) => {
  try {
    const orders = await PlaceOrder.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
});

//
//  Place an order
app.post("/orders/:userId", async (req, res) => {
  try {
    const { items, total, deliveryInfo, paymentMethod } = req.body;

    const newOrder = new PlaceOrder({
      userId: req.params.userId,
      items,
      total,
      deliveryInfo,
      paymentMethod,
    });

    await newOrder.save();
    res.json(newOrder);
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).send("Error placing order");
  }
});

//  Get order history
app.get("/orders/:userId", async (req, res) => {
  try {
    const orders = await PlaceOrder.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Error fetching order history");
  }
});

