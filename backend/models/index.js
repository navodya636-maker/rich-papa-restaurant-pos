const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "cashier"], default: "cashier" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const customerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, index: true },
  address: String,
  totalPurchases: { type: Number, default: 0 }
}, { timestamps: true });

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const menuItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  available: { type: Boolean, default: true },
  image: String
}, { timestamps: true });
menuItemSchema.index({ name: "text" });

const restaurantTableSchema = new Schema({
  number: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["available", "occupied", "reserved"], default: "available" }
}, { timestamps: true });

const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  method: { type: String, enum: ["cash", "card", "bank"], required: true },
  amount: { type: Number, required: true, min: 0 },
  amountReceived: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  cashier: { type: Schema.Types.ObjectId, ref: "User", required: true },
  refunded: { type: Boolean, default: false }
}, { timestamps: true });

const orderSchema = new Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  orderType: { type: String, enum: ["dine-in", "takeaway", "delivery"], required: true },
  table: { type: Schema.Types.ObjectId, ref: "Table" },
  customer: { type: Schema.Types.ObjectId, ref: "Customer" },
  customerName: String,
  customerPhone: String,
  deliveryAddress: String,
  deliveryFee: { type: Number, default: 0, min: 0 },
  items: [{
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    instructions: String
  }],
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["held", "new", "preparing", "ready", "served", "paid", "cancelled"], default: "new" },
  deliveryStatus: { type: String, enum: ["pending", "assigned", "out-for-delivery", "completed"], default: "pending" },
  cashier: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
orderSchema.index({ createdAt: -1 });

const invoiceSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true },
  total: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  balance: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], required: true }
}, { timestamps: true });

const inventorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "pcs" },
  reorderLevel: { type: Number, default: 5, min: 0 }
}, { timestamps: true });

const stockMovementSchema = new Schema({
  inventoryItem: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  type: { type: String, enum: ["in", "out", "adjustment"], required: true },
  quantity: { type: Number, required: true },
  reason: String,
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const expenseSchema = new Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  description: String,
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Customer: mongoose.model("Customer", customerSchema),
  Category: mongoose.model("Category", categorySchema),
  MenuItem: mongoose.model("MenuItem", menuItemSchema),
  Table: mongoose.model("Table", restaurantTableSchema),
  Order: mongoose.model("Order", orderSchema),
  Payment: mongoose.model("Payment", paymentSchema),
  Invoice: mongoose.model("Invoice", invoiceSchema),
  InventoryItem: mongoose.model("InventoryItem", inventorySchema),
  StockMovement: mongoose.model("StockMovement", stockMovementSchema),
  Expense: mongoose.model("Expense", expenseSchema)
};
