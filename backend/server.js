require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const connectDB = require("./config/db");
const {
  User, Customer, Category, MenuItem, Table, Order, Payment,
  Invoice, InventoryItem, StockMovement, Expense
} = require("./models");
const { protect, authorize } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

app.get("/api/health", (req, res) => res.json({ status: "ok", restaurant: "RICH PAPA FAMILY RESTAURANT" }));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (!user.active) return res.status(403).json({ message: "Account is disabled" });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));

app.get("/api/auth/me", protect, (req, res) =>
  res.json({ id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }));

app.get("/api/users", protect, authorize("admin"), asyncHandler(async (req, res) =>
  res.json(await User.find().sort({ name: 1 }))));
app.post("/api/users", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  if (!["admin", "cashier"].includes(role)) return res.status(400).json({ message: "Invalid role" });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email already exists" });
  const user = await User.create({ name, email, role, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });
}));
app.put("/api/users/:id", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const update = {};
  ["name", "role", "active"].forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });
  if (req.body.password) update.password = await bcrypt.hash(req.body.password, 12);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}));
app.delete("/api/users/:id", protect, authorize("admin"), asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: "Cannot delete your own account" });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
}));

const crud = (Model, basePath, adminWrite = false) => {
  app.get(basePath, protect, asyncHandler(async (req, res) => {
    const q = req.query.search ? { $text: { $search: req.query.search } } : {};
    res.json(await Model.find(q).sort({ createdAt: -1 }));
  }));
  app.post(basePath, protect, ...(adminWrite ? [authorize("admin")] : []), asyncHandler(async (req, res) =>
    res.status(201).json(await Model.create(req.body))));
  app.put(`${basePath}/:id`, protect, ...(adminWrite ? [authorize("admin")] : []), asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Record not found" });
    res.json(item);
  }));
  app.delete(`${basePath}/:id`, protect, ...(adminWrite ? [authorize("admin")] : []), asyncHandler(async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  }));
};

crud(Category, "/api/categories", true);
crud(MenuItem, "/api/menu", true);
crud(Table, "/api/tables", true);
crud(Customer, "/api/customers");
crud(InventoryItem, "/api/inventory", true);
crud(Expense, "/api/expenses", true);

app.post("/api/menu/upload", protect, authorize("admin"), upload.single("image"), (req, res) =>
  res.json({ image: `/uploads/${req.file.filename}` }));

app.put("/api/tables/:id/status", protect, asyncHandler(async (req, res) => {
  const table = await Table.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!table) return res.status(404).json({ message: "Table not found" });
  res.json(table);
}));

app.put("/api/tables/:id/transfer", protect, asyncHandler(async (req, res) => {
  const from = await Table.findById(req.params.id);
  const to = await Table.findById(req.body.toTableId);
  if (!from || !to) return res.status(404).json({ message: "Table not found" });
  if (to.status === "occupied") return res.status(409).json({ message: "Destination table is occupied" });
  const order = await Order.findOne({ table: from._id, status: { $nin: ["paid", "cancelled", "served"] } });
  if (!order) return res.status(404).json({ message: "No active order found on this table" });
  order.table = to._id;
  await order.save();
  from.status = "available";
  to.status = "occupied";
  await Promise.all([from.save(), to.save()]);
  res.json({ order, from, to });
}));

app.get("/api/orders", protect, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.orderType = req.query.type;
  const query = req.user.role === "cashier" ? { ...filter, cashier: req.user._id } : filter;
  res.json(await Order.find(query).populate("table customer cashier", "number name phone").sort({ createdAt: -1 }).limit(500));
}));

app.get("/api/orders/kitchen", protect, asyncHandler(async (req, res) =>
  res.json(await Order.find({ status: { $in: ["new", "preparing", "ready"] } })
    .populate("table", "number").sort({ createdAt: 1 }))));

app.post("/api/orders", protect, asyncHandler(async (req, res) => {
  const { orderType, tableId, customerId, customerName, customerPhone, deliveryAddress,
    deliveryFee = 0, discount = 0, tax = 0, items = [] } = req.body;
  if (!["dine-in", "takeaway", "delivery"].includes(orderType)) return res.status(400).json({ message: "Invalid order type" });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: "Order must contain at least one item" });

  if (orderType === "dine-in") {
    if (!tableId) return res.status(400).json({ message: "Table is required" });
    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: "Table not found" });
    if (table.status === "occupied") return res.status(409).json({ message: "Table is already occupied" });
  }

  let subtotal = 0;
  const calculatedItems = [];
  for (const entry of items) {
    const menuItem = await MenuItem.findById(entry.menuItem);
    if (!menuItem || !menuItem.available) return res.status(400).json({ message: "An item is unavailable" });
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: "Invalid quantity" });
    if (menuItem.stock < quantity) return res.status(409).json({ message: `Insufficient stock: ${menuItem.name}` });
    subtotal += roundMoney(menuItem.price * quantity);
    calculatedItems.push({
      menuItem: menuItem._id, name: menuItem.name, price: menuItem.price,
      quantity, instructions: entry.instructions || ""
    });
  }
  const discountAmount = roundMoney(discount);
  const taxAmount = roundMoney(tax);
  const fee = roundMoney(deliveryFee);
  if (discountAmount < 0 || taxAmount < 0 || fee < 0) return res.status(400).json({ message: "Negative amounts are not allowed" });
  const total = roundMoney(subtotal - discountAmount + taxAmount + fee);
  if (total < 0) return res.status(400).json({ message: "Order total cannot be negative" });

  const count = await Order.countDocuments();
  const invoiceNumber = `RP-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  for (const item of calculatedItems) {
    await MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { stock: -item.quantity } });
  }
  if (tableId && orderType === "dine-in") await Table.findByIdAndUpdate(tableId, { status: "occupied" });

  const order = await Order.create({
    invoiceNumber, orderType, table: tableId || undefined, customer: customerId || undefined,
    customerName, customerPhone, deliveryAddress, deliveryFee: fee, items: calculatedItems,
    subtotal: roundMoney(subtotal), discount: discountAmount, tax: taxAmount, total,
    status: req.body.status === "held" ? "held" : "new", cashier: req.user._id,
    deliveryStatus: orderType === "delivery" ? "pending" : undefined
  });
  res.status(201).json(await order.populate("table customer cashier", "number name phone"));
}));

app.put("/api/orders/:id/status", protect, asyncHandler(async (req, res) => {
  const allowed = ["held", "new", "preparing", "ready", "served", "paid", "cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  order.status = req.body.status;
  await order.save();
  if (order.status === "cancelled") {
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { stock: item.quantity } });
    }
  }
  if (["paid", "cancelled", "served"].includes(order.status) && order.table) {
    await Table.findByIdAndUpdate(order.table, { status: "available" });
  }
  res.json(order);
}));

app.put("/api/orders/:id/delivery", protect, asyncHandler(async (req, res) => {
  const allowed = ["pending", "assigned", "out-for-delivery", "completed"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid delivery status" });
  const order = await Order.findById(req.params.id);
  if (!order || order.orderType !== "delivery") return res.status(404).json({ message: "Delivery order not found" });
  order.deliveryStatus = req.body.status;
  await order.save();
  res.json(order);
}));

app.post("/api/orders/:id/payment", protect, asyncHandler(async (req, res) => {
  const { method, amountReceived = 0 } = req.body;
  if (!["cash", "card", "bank"].includes(method)) return res.status(400).json({ message: "Invalid payment method" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const existing = await Payment.findOne({ order: order._id, refunded: false });
  if (existing && order.amountPaid >= order.total) {
    return res.status(409).json({ message: "Order has already been fully paid" });
  }
  const received = roundMoney(Number(amountReceived));
  if (!Number.isFinite(received) || received < 0) return res.status(400).json({ message: "Invalid payment amount" });
  const remaining = roundMoney(order.total - order.amountPaid);
  if (received <= 0) {
    return res.status(400).json({ message: "Payment amount must be greater than zero" });
  }
  if (method !== "cash" && received > remaining) {
    return res.status(400).json({ message: `Payment must not exceed LKR ${remaining.toFixed(2)}` });
  }
  const applied = method === "cash" ? Math.min(received, remaining) : received;
  const change = method === "cash" ? roundMoney(received - applied) : 0;
  const payment = await Payment.create({
    order: order._id, method, amount: applied, amountReceived: received,
    change, cashier: req.user._id
  });
  order.amountPaid = roundMoney(order.amountPaid + applied);
  order.status = order.amountPaid >= order.total ? "paid" : order.status;
  await order.save();
  if (order.table && order.status === "paid") await Table.findByIdAndUpdate(order.table, { status: "available" });

  let invoice = await Invoice.findOne({ order: order._id });
  const balance = roundMoney(order.total - order.amountPaid);
  const paymentStatus = balance <= 0 ? "paid" : order.amountPaid > 0 ? "partial" : "unpaid";
  if (invoice) {
    invoice.amountPaid = order.amountPaid; invoice.balance = balance; invoice.paymentStatus = paymentStatus;
    await invoice.save();
  } else {
    invoice = await Invoice.create({
      order: order._id, invoiceNumber: order.invoiceNumber, total: order.total,
      amountPaid: order.amountPaid, balance, paymentStatus
    });
  }
  if (order.customer) {
    await Customer.findByIdAndUpdate(order.customer, { $inc: { totalPurchases: applied } });
  }
  res.status(201).json({ payment, invoice, order });
}));

app.post("/api/orders/:id/refund", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  for (const item of order.items) {
    await MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { stock: item.quantity } });
  }
  await Payment.updateMany({ order: order._id }, { refunded: true });
  order.status = "cancelled";
  order.amountPaid = 0;
  await order.save();
  await Invoice.findOneAndUpdate({ order: order._id }, { balance: order.total, paymentStatus: "unpaid" });
  if (order.table) await Table.findByIdAndUpdate(order.table, { status: "available" });
  res.json({ message: "Refund recorded", order });
}));

app.post("/api/inventory/:id/movement", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Inventory item not found" });
  const quantity = Number(req.body.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) return res.status(400).json({ message: "Invalid quantity" });
  const type = req.body.type;
  const next = type === "in" ? item.quantity + quantity : type === "out" ? item.quantity - quantity : quantity;
  if (next < 0) return res.status(400).json({ message: "Negative inventory is not allowed" });
  item.quantity = next;
  await item.save();
  const movement = await StockMovement.create({
    inventoryItem: item._id,
    type: type === "adjustment" ? "adjustment" : type,
    quantity: type === "adjustment" ? next : quantity,
    reason: req.body.reason || "",
    user: req.user._id
  });
  res.status(201).json({ item, movement });
}));

app.get("/api/reports/dashboard", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const paid = { status: "paid" };
  const todayOrders = await Order.find({ createdAt: { $gte: start } });
  const monthOrders = await Order.find({ createdAt: { $gte: month }, status: "paid" });
  const allPaid = await Order.find(paid);
  const todaySales = todayOrders.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.total, 0);
  const monthSales = monthOrders.reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = allPaid.reduce((sum, o) => sum + o.total, 0);
  const expenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  res.json({
    todaySales: roundMoney(todaySales),
    totalRevenue: roundMoney(totalRevenue),
    todayOrders: todayOrders.length,
    monthlySales: roundMoney(monthSales),
    totalCustomers: await Customer.countDocuments(),
    totalExpenses: roundMoney(expenses[0]?.total || 0),
    availableTables: await Table.countDocuments({ status: "available" }),
    occupiedTables: await Table.countDocuments({ status: "occupied" }),
    lowStock: await MenuItem.find({ $expr: { $lte: ["$stock", 5] }, available: true }).limit(20),
    recentOrders: await Order.find().populate("table", "number").sort({ createdAt: -1 }).limit(8)
  });
}));

app.get("/api/reports/sales", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  const match = { createdAt: { $gte: from, $lte: to }, status: "paid" };
  const orders = await Order.find(match).populate("items.menuItem", "name");
  const salesByDay = {};
  const byType = {};
  const itemSales = {};
  const methods = {};
  orders.forEach((order) => {
    const day = order.createdAt.toISOString().slice(0, 10);
    salesByDay[day] = (salesByDay[day] || 0) + order.total;
    byType[order.orderType] = (byType[order.orderType] || 0) + order.total;
    order.items.forEach((item) => {
      itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
    });
  });
  for (const payment of await Payment.find({ refunded: false })) {
    methods[payment.method] = (methods[payment.method] || 0) + payment.amount;
  }
  res.json({
    totalSales: roundMoney(orders.reduce((sum, o) => sum + o.total, 0)),
    orderCount: orders.length,
    salesByDay: Object.entries(salesByDay).map(([date, sales]) => ({ date, sales })),
    salesByType: Object.entries(byType).map(([type, sales]) => ({ type, sales })),
    popularItems: Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, quantity]) => ({ name, quantity })),
    paymentMethods: Object.entries(methods).map(([method, amount]) => ({ method, amount }))
  });
}));

app.get("/api/payments", protect, authorize("admin"), asyncHandler(async (req, res) =>
  res.json(await Payment.find().populate("order cashier", "invoiceNumber name").sort({ createdAt: -1 }).limit(500))));

app.use((req, res) => res.status(404).json({ message: "API route not found" }));
app.use((error, req, res, next) => {
  console.error(error);
  const status = error.name === "ValidationError" ? 400 : error.code === 11000 ? 409 : 500;
  res.status(status).json({ message: error.message || "Server error" });
});

async function seed() {
  if (await User.countDocuments()) return;
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const cashierPassword = await bcrypt.hash("Cashier@123", 12);
  await User.create([
    { name: "Restaurant Admin", email: "admin@richpapa.lk", password: adminPassword, role: "admin" },
    { name: "Cashier", email: "cashier@richpapa.lk", password: cashierPassword, role: "cashier" }
  ]);
  const categories = await Category.create([
    { name: "Rice" }, { name: "Noodles" }, { name: "Drinks" }, { name: "Desserts" }
  ]);
  await MenuItem.create([
    { name: "Chicken Fried Rice", category: categories[0]._id, price: 1100, stock: 40, description: "Fried rice with chicken" },
    { name: "Seafood Rice", category: categories[0]._id, price: 1450, stock: 25, description: "Rice with seafood" },
    { name: "Vegetable Noodles", category: categories[1]._id, price: 850, stock: 30, description: "Stir-fried noodles" },
    { name: "Iced Tea", category: categories[2]._id, price: 350, stock: 50, description: "Fresh iced tea" },
    { name: "Chocolate Cake", category: categories[3]._id, price: 550, stock: 20, description: "House chocolate cake" }
  ]);
  await Table.insertMany([
    { number: "T1", capacity: 2 }, { number: "T2", capacity: 4 },
    { number: "T3", capacity: 4 }, { number: "T4", capacity: 6 },
    { number: "T5", capacity: 8 }
  ]);
  console.log("Seed accounts and demo data created");
}

const PORT = process.env.PORT || 5000;
connectDB()
  .then(async () => { await seed(); app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)); })
  .catch((error) => { console.error("MongoDB connection failed:", error.message); process.exit(1); });
