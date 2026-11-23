
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, UtensilsCrossed, TableProperties, CookingPot, Package,
  UserRound, ReceiptText, BarChart3, WalletCards, LogOut, Menu as MenuIcon,
  ShoppingCart, Search, Plus, Minus, Trash2, Printer, Send, CreditCard
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";

const money = (n) =>
  `LKR ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("admin@richpapa.lk");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">RP</div>
        <p className="eyebrow">Restaurant Point of Sale</p>
        <h1>RICH PAPA</h1>
        <p className="muted">Family Restaurant · Balangoda</p>

        {error && <div className="alert error">{error}</div>}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="btn primary full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="demo">
          <b>Demo accounts</b>
          <br />
          Admin: admin@richpapa.lk / Admin@123
          <br />
          Cashier: cashier@richpapa.lk / Cashier@123
        </div>
      </form>
    </div>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const nav = [
    ["Dashboard", "/dashboard", LayoutDashboard, "admin"],
    ["POS Billing", "/pos", ShoppingCart],
    ["Tables", "/tables", TableProperties, "admin"],
    ["Kitchen", "/kitchen", CookingPot],
    ["Menu", "/menu", UtensilsCrossed, "admin"],
    ["Inventory", "/inventory", Package, "admin"],
    ["Customers", "/customers"],
    ["Orders", "/orders", ReceiptText],
    ["Expenses", "/expenses", WalletCards, "admin"],
    ["Users", "/users", UserRound, "admin"],
    ["Reports", "/reports", BarChart3, "admin"]
  ];

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="side-brand">
          <span className="mini-mark">RP</span>
          <div>
            <b>RICH PAPA</b>
            <small>Family Restaurant</small>
          </div>
        </div>

        <nav>
          {nav
            .filter(([, , , role]) => !role || role === user.role)
            .map(([label, path, Icon]) => (
              <Link
                key={path}
                to={path}
                className={location.pathname === path ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {Icon ? <Icon size={18} /> : <ReceiptText size={18} />}
                <span>{label}</span>
              </Link>
            ))}
        </nav>

        <button className="logout" onClick={logout}>
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main>
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setOpen(!open)}
          >
            <MenuIcon />
          </button>

          <div>
            <p>Good day</p>
            <b>{user.name}</b>
          </div>

          <span className="role">{user.role}</span>
        </header>

        <div className="content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/users" element={<Users />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/dashboard")
      .then((r) => setData(r.data))
      .catch((err) => console.error("Dashboard loading failed:", err));
  }, []);

  if (!data) return <Loading />;

  const cards = [
    ["Today's Sales", data.todaySales],
    ["Total Revenue", data.totalRevenue],
    ["Today's Orders", data.todayOrders],
    ["Monthly Sales", data.monthlySales],
    ["Total Customers", data.totalCustomers],
    ["Total Expenses", data.totalExpenses],
    ["Available Tables", data.availableTables],
    ["Occupied Tables", data.occupiedTables]
  ];

  return (
    <>
      <PageTitle
        title="Dashboard"
        subtitle="Live restaurant performance"
      />

      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>
              {label.includes("Sales") ||
              label.includes("Revenue") ||
              label.includes("Expenses")
                ? money(value)
                : value}
            </strong>
          </div>
        ))}
      </div>

      <div className="grid-two">
        <section className="panel">
          <h3>Recent Orders</h3>
          <Table
            headers={["Invoice", "Type", "Table", "Total", "Status"]}
            rows={(data.recentOrders || []).map((o) => [
              o.invoiceNumber,
              o.orderType,
              o.table?.number || "-",
              money(o.total),
              o.status
            ])}
          />
        </section>

        <section className="panel">
          <h3>Low Stock Alerts</h3>
          {data.lowStock?.length ? (
            data.lowStock.map((i) => (
              <div className="list-row" key={i._id}>
                <b>{i.name}</b>
                <span className="badge warning">{i.stock} left</span>
              </div>
            ))
          ) : (
            <Empty text="No low stock items" />
          )}
        </section>
      </div>
    </>
  );
}

function POS() {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine-in");
  const [tableId, setTableId] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: ""
  });
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [notice, setNotice] = useState("");
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get("/menu"),
      api.get("/categories"),
      api.get("/tables")
    ])
      .then(([m, c, t]) => {
        if (!active) return;
        setMenu(m.data);
        setCategories(c.data);
        setTables(t.data);
      })
      .catch((err) => {
        if (active) {
          setNotice(
            err.response?.data?.message ||
            "Could not load POS data. Please refresh."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = menu.filter((i) =>
    i.available &&
    (category === "all" ||
      i.category?._id === category ||
      i.category === category) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const add = (item) => {
    setCart((old) =>
      old.some((i) => i._id === item._id)
        ? old.map((i) =>
            i._id === item._id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...old, { ...item, quantity: 1 }]
    );
  };

  const subtotal = cart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const total = Math.max(
    0,
    subtotal -
      Number(discount) +
      Number(tax) +
      (orderType === "delivery" ? Number(deliveryFee) : 0)
  );

  const placeOrder = async (status = "new", pay = false) => {
    if (!cart.length) {
      setNotice("Add at least one menu item.");
      return;
    }

    if (orderType === "dine-in" && !tableId) {
      setNotice("Select an available table.");
      return;
    }

    try {
      const { data: order } = await api.post("/orders", {
        orderType,
        tableId: orderType === "dine-in" ? tableId : undefined,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryAddress: customer.address,
        deliveryFee: orderType === "delivery" ? deliveryFee : 0,
        discount,
        tax,
        items: cart.map((i) => ({
          menuItem: i._id,
          quantity: i.quantity
        })),
        status
      });

      setNotice(
        status === "held"
          ? "Order held successfully."
          : "Order sent to kitchen."
      );

      if (pay) {
        setCheckout(order);
      } else {
        setCart([]);
        setTableId("");
        setCustomer({ name: "", phone: "", address: "" });
      }
    } catch (err) {
      setNotice(
        err.response?.data?.message ||
        "Could not create order."
      );
    }
  };

  const completePayment = async (method, amountReceived) => {
    try {
      const { data } = await api.post(
        `/orders/${checkout._id}/payment`,
        { method, amountReceived }
      );

      setCheckout(null);
      setCart([]);
      setTableId("");
      setCustomer({ name: "", phone: "", address: "" });

      setNotice(
        `Payment complete. Invoice ${data.invoice.invoiceNumber}`
      );
    } catch (err) {
      setNotice(
        err.response?.data?.message || "Payment failed."
      );
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageTitle
        title="POS Billing"
        subtitle="Create and process customer orders"
      />

      {notice && <div className="alert">{notice}</div>}

      <div className="pos-layout">
        <section className="menu-area">
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="category-tabs">
            <button
              className={category === "all" ? "active" : ""}
              onClick={() => setCategory("all")}
            >
              All
            </button>

            {categories.map((c) => (
              <button
                key={c._id}
                className={category === c._id ? "active" : ""}
                onClick={() => setCategory(c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="menu-grid">
            {filtered.map((item) => (
              <button
                className="food-card"
                key={item._id}
                onClick={() => add(item)}
              >
                <div className="food-thumb">
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <UtensilsCrossed />
                  )}
                </div>
                <b>{item.name}</b>
                <span>{money(item.price)}</span>
                <small>{item.stock} available</small>
              </button>
            ))}
          </div>

          {!filtered.length && (
            <Empty text="No menu items found" />
          )}
        </section>

        <aside className="cart">
          <div className="order-types">
            {["dine-in", "takeaway", "delivery"].map((type) => (
              <button
                key={type}
                className={orderType === type ? "active" : ""}
                onClick={() => {
                  setOrderType(type);
                  setTableId("");
                  setNotice("");
                }}
              >
                {type.replace("-", " ")}
              </button>
            ))}
          </div>

          {orderType === "dine-in" && (
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            >
              <option value="">Select table</option>
              {tables
                .filter((t) => t.status === "available")
                .map((t) => (
                  <option value={t._id} key={t._id}>
                    {t.number} · {t.capacity} seats
                  </option>
                ))}
            </select>
          )}

          {orderType !== "dine-in" && (
            <div className="customer-fields">
              <input
                placeholder="Customer name"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
              />
              <input
                placeholder="Phone"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer({ ...customer, phone: e.target.value })
                }
              />
              {orderType === "delivery" && (
                <input
                  placeholder="Delivery address"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
              )}
            </div>
          )}

          <div className="cart-items">
            {cart.length ? (
              cart.map((item) => (
                <div className="cart-item" key={item._id}>
                  <div>
                    <b>{item.name}</b>
                    <small>{money(item.price)}</small>
                  </div>

                  <div className="qty">
                    <button
                      onClick={() =>
                        setCart((old) =>
                          old
                            .map((i) =>
                              i._id === item._id
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                            )
                            .filter((i) => i.quantity > 0)
                        )
                      }
                    >
                      <Minus />
                    </button>

                    <b>{item.quantity}</b>

                    <button onClick={() => add(item)}>
                      <Plus />
                    </button>
                  </div>

                  <button
                    className="icon-button"
                    onClick={() =>
                      setCart((old) =>
                        old.filter((i) => i._id !== item._id)
                      )
                    }
                  >
                    <Trash2 />
                  </button>
                </div>
              ))
            ) : (
              <Empty text="Your cart is empty" />
            )}
          </div>

          <div className="totals">
            <label>
              Discount
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </label>

            <label>
              Tax
              <input
                type="number"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </label>

            {orderType === "delivery" && (
              <label>
                Delivery fee
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                />
              </label>
            )}

            <div className="subtotal">
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>

            <div className="grand">
              <span>Grand total</span>
              <b>{money(total)}</b>
            </div>
          </div>

          <div className="cart-actions">
            <button onClick={() => placeOrder("held")}>
              <Package /> Hold
            </button>

            <button
              onClick={() => {
                setCart([]);
                setNotice("Cart cleared.");
              }}
            >
              <Trash2 /> Cancel
            </button>

            <button onClick={() => placeOrder("new")}>
              <Send /> Kitchen
            </button>

            <button
              className="checkout"
              onClick={() => placeOrder("new", true)}
            >
              <CreditCard /> Checkout
            </button>
          </div>
        </aside>
      </div>

      {checkout && (
        <PaymentModal
          order={checkout}
          onClose={() => setCheckout(null)}
          onPay={completePayment}
        />
      )}
    </>
  );
}

function PaymentModal({ order, onClose, onPay }) {
  const [method, setMethod] = useState("cash");
  const [received, setReceived] = useState(order.total);

  const change =
    method === "cash"
      ? Math.max(0, Number(received) - order.total)
      : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Complete Payment</h2>
        <p>
          Invoice <b>{order.invoiceNumber}</b>
        </p>

        <div className="payment-total">{money(order.total)}</div>

        <div className="method-tabs">
          {["cash", "card", "bank"].map((m) => (
            <button
              className={method === m ? "active" : ""}
              key={m}
              onClick={() => setMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <label>
          Amount received
          <input
            type="number"
            min="0"
            step="0.01"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
          />
        </label>

        {method === "cash" && (
          <div className="change">
            <span>Change</span>
            <b>{money(change)}</b>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => onPay(method, Number(received))}
          >
            <CreditCard /> Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function Tables() {
  const [tables, setTables] = useState([]);
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/tables");
      setTables(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load tables.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/tables", { number, capacity: Number(capacity) });
      setNumber("");
      setCapacity(4);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add table.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this table?")) return;

    try {
      await api.delete(`/tables/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete table.");
    }
  };

  const status = async (table, next) => {
    try {
      await api.put(`/tables/${table._id}/status`, { status: next });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update table.");
    }
  };

  return (
    <>
      <PageTitle
        title="Table Management"
        subtitle="Assign, reserve and manage dining tables"
      />

      {error && <div className="alert error">{error}</div>}

      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Table number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />

        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />

        <button className="btn primary">
          <Plus /> Add table
        </button>
      </form>

      <div className="table-grid">
        {tables.map((t) => (
          <div className={`table-card ${t.status}`} key={t._id}>
            <TableProperties />
            <h3>{t.number}</h3>
            <p>{t.capacity} seats</p>
            <span className={`badge ${t.status}`}>{t.status}</span>

            <div className="table-actions">
              <button
                onClick={() =>
                  status(
                    t,
                    t.status === "available" ? "reserved" : "available"
                  )
                }
              >
                {t.status === "available" ? "Reserve" : "Release"}
              </button>

              <button onClick={() => remove(t._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {!tables.length && <Empty text="No tables found" />}
    </>
  );
}

function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/orders/kitchen");
      setOrders(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load kitchen orders.");
    }
  };

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const update = async (order, status) => {
    try {
      await api.put(`/orders/${order._id}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update order.");
    }
  };

  return (
    <>
      <PageTitle
        title="Kitchen Display"
        subtitle="Live order queue · refreshes every 5 seconds"
      />

      {error && <div className="alert error">{error}</div>}

      <div className="kitchen-grid">
        {orders.map((o) => (
          <article className={`ticket ${o.status}`} key={o._id}>
            <div className="ticket-head">
              <b>{o.invoiceNumber}</b>
              <span>{o.orderType}</span>
            </div>

            {o.table && <small>Table {o.table.number}</small>}

            <ul>
              {(o.items || []).map((i, n) => (
                <li key={n}>
                  <b>{i.quantity} × {i.name}</b>
                  {i.instructions && <em>{i.instructions}</em>}
                </li>
              ))}
            </ul>

            <div className="ticket-actions">
              {o.status === "new" && (
                <button onClick={() => update(o, "preparing")}>
                  Start
                </button>
              )}

              {o.status === "preparing" && (
                <button onClick={() => update(o, "ready")}>
                  Ready
                </button>
              )}

              {o.status === "ready" && (
                <button onClick={() => update(o, "served")}>
                  Serve
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!orders.length && <Empty text="No active kitchen orders" />}
    </>
  );
}

function Menu() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    available: true
  });

  const load = async () => {
    try {
      const [m, c] = await Promise.all([
        api.get("/menu"),
        api.get("/categories")
      ]);

      setItems(m.data);
      setCategories(c.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load menu.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/menu", {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock)
      });

      setShow(false);

      setForm({
        name: "",
        category: "",
        price: "",
        stock: "",
        description: "",
        available: true
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save menu item.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      await api.delete(`/menu/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete menu item.");
    }
  };

  return (
    <>
      <PageTitle
        title="Menu Management"
        action={
          <button className="btn primary" onClick={() => setShow(true)}>
            <Plus /> Add item
          </button>
        }
      />

      {error && <div className="alert error">{error}</div>}

      <div className="menu-admin-grid">
        {items.map((i) => (
          <div className="menu-admin-card" key={i._id}>
            <div className="food-thumb large">
              {i.image ? (
                <img src={i.image} alt={i.name} />
              ) : (
                <UtensilsCrossed />
              )}
            </div>

            <div>
              <h3>{i.name}</h3>
              <p>{i.description || "Restaurant menu item"}</p>
              <b>{money(i.price)}</b>
              <span className="badge">{i.stock} stock</span>
            </div>

            <button className="icon-button" onClick={() => remove(i._id)}>
              <Trash2 />
            </button>
          </div>
        ))}
      </div>

      {!items.length && <Empty text="No menu items found" />}

      {show && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <h2>Add Menu Item</h2>

            <div className="form-grid">
              <input
                placeholder="Item name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                required
              >
                <option value="">Category</option>
                {categories.map((c) => (
                  <option value={c._id} key={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                required
              />

              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: e.target.value })
                }
              />

              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShow(false)}>
                Cancel
              </button>

              <button className="btn primary">Save item</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Inventory() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    quantity: 0,
    unit: "pcs",
    reorderLevel: 5
  });

  const load = async () => {
    try {
      const { data } = await api.get("/inventory");
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load inventory.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/inventory", form);

      setForm({
        name: "",
        quantity: 0,
        unit: "pcs",
        reorderLevel: 5
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add stock.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete inventory item?")) return;

    try {
      await api.delete(`/inventory/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete item.");
    }
  };

  const movement = async (item, type) => {
    const value = window.prompt(
      `Enter quantity to ${type === "in" ? "add" : "remove"}`
    );

    if (!value || Number(value) <= 0) return;

    try {
      await api.post(`/inventory/${item._id}/movement`, {
        type,
        quantity: Number(value),
        reason: "Manual stock update"
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Stock update failed.");
    }
  };

  return (
    <>
      <PageTitle
        title="Inventory"
        subtitle="Stock quantities and reorder levels"
      />

      {error && <div className="alert error">{error}</div>}

      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Item name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          type="number"
          min="0"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) =>
            setForm({ ...form, quantity: Number(e.target.value) })
          }
        />

        <input
          placeholder="Unit"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />

        <input
          type="number"
          min="0"
          placeholder="Reorder level"
          value={form.reorderLevel}
          onChange={(e) =>
            setForm({ ...form, reorderLevel: Number(e.target.value) })
          }
        />

        <button className="btn primary">
          <Plus /> Add stock
        </button>
      </form>

      <section className="panel">
        <Table
          headers={["Item", "Quantity", "Unit", "Reorder", "Actions"]}
          rows={items.map((i) => [
            i.name,
            i.quantity,
            i.unit,
            i.reorderLevel,
            <div className="row-actions" key={i._id}>
              <button onClick={() => movement(i, "in")}>+ In</button>
              <button onClick={() => movement(i, "out")}>− Out</button>
              <button onClick={() => remove(i._id)}>Delete</button>
            </div>
          ])}
        />
      </section>
    </>
  );
}

function Customers() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const load = async () => {
    try {
      const { data } = await api.get("/customers");
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load customers.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/customers", form);
      setForm({ name: "", phone: "", address: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add customer.");
    }
  };

  const filtered = items.filter((i) =>
    `${i.name} ${i.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageTitle
        title="Customers"
        subtitle="Customer directory and purchase history"
      />

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />

        <input
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        <button className="btn primary">
          <Plus /> Add customer
        </button>
      </form>

      <section className="panel">
        <Table
          headers={["Name", "Phone", "Address", "Purchases"]}
          rows={filtered.map((i) => [
            i.name,
            i.phone,
            i.address || "-",
            money(i.totalPurchases)
          ])}
        />
      </section>
    </>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/orders");
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load orders.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const printOrder = (order) => {
    const html = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              width: 80mm;
              font-family: monospace;
              font-size: 12px;
              margin: 0;
              padding: 8mm;
            }
            h2 { text-align: center; }
            .line { border-top: 1px dashed #000; }
            .row { display: flex; justify-content: space-between; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>RICH PAPA<br/>FAMILY RESTAURANT</h2>
          <div class="center">
            93/1, Main Street, Balangoda<br/>
            0771042600 | 0770322800
          </div>
          <p>
            <b>${String(order.orderType || "").toUpperCase()}</b><br/>
            BILL NO: ${order.invoiceNumber}<br/>
            Ordered: ${new Date(order.createdAt).toLocaleString()}
          </p>
          <div class="line"></div>
          ${(order.items || []).map((i) => `
            <b>${i.name}</b>
            <div class="row">
              <span>${i.quantity} @ ${Number(i.price || 0).toFixed(2)}</span>
              <span>${(Number(i.quantity || 0) * Number(i.price || 0)).toFixed(2)}</span>
            </div>
          `).join("")}
          <div class="line"></div>
          <div class="row">
            <b>Sub</b>
            <span>${Number(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Discount</span>
            <span>${Number(order.discount || 0).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Tax</span>
            <span>${Number(order.tax || 0).toFixed(2)}</span>
          </div>
          <div class="row">
            <b>BILL AMT</b>
            <b>${Number(order.total || 0).toFixed(2)}</b>
          </div>
          <p class="center">Thank you. Please Visit Again.</p>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");

    if (!win) {
      setError("Please allow pop-ups to print the receipt.");
      return;
    }

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <>
      <PageTitle
        title="Orders"
        subtitle="Order history and reprinting"
      />

      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <Table
          headers={[
            "Invoice",
            "Type",
            "Customer",
            "Total",
            "Paid",
            "Status",
            "Action"
          ]}
          rows={orders.map((o) => [
            o.invoiceNumber,
            o.orderType,
            o.customerName || o.customer?.name || "-",
            money(o.total),
            money(o.amountPaid),
            o.status,
            <button
              key={o._id}
              className="icon-button"
              onClick={() => printOrder(o)}
            >
              <Printer />
            </button>
          ])}
        />
      </section>
    </>
  );
}

function Expenses() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: ""
  });

  const load = async () => {
    try {
      const { data } = await api.get("/expenses");
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load expenses.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/expenses", {
        ...form,
        amount: Number(form.amount),
        date: new Date(form.date)
      });

      setForm({
        category: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: ""
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add expense.");
    }
  };

  return (
    <>
      <PageTitle
        title="Expenses"
        subtitle="Track restaurant operating costs"
      />

      {error && <div className="alert error">{error}</div>}

      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
          required
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) =>
            setForm({ ...form, amount: e.target.value })
          }
          required
        />

        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
        />

        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <button className="btn primary">
          <Plus /> Add expense
        </button>
      </form>

      <section className="panel">
        <Table
          headers={["Date", "Category", "Description", "Amount"]}
          rows={items.map((i) => [
            new Date(i.date).toLocaleDateString(),
            i.category,
            i.description || "-",
            money(i.amount)
          ])}
        />
      </section>
    </>
  );
}

function Users() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier"
  });

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load users.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/users", form);

      setForm({
        name: "",
        email: "",
        password: "",
        role: "cashier"
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add user.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete user.");
    }
  };

  return (
    <>
      <PageTitle
        title="User Management"
        subtitle="Administrators and cashiers"
      />

      {error && <div className="alert error">{error}</div>}

      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          required
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
        >
          <option value="cashier">Cashier</option>
          <option value="admin">Admin</option>
        </select>

        <button className="btn primary">
          <Plus /> Add user
        </button>
      </form>

      <section className="panel">
        <Table
          headers={["Name", "Email", "Role", "Status", "Action"]}
          rows={items.map((i) => [
            i.name,
            i.email,
            i.role,
            i.active ? "Active" : "Disabled",
            <button
              key={i._id}
              className="icon-button"
              onClick={() => remove(i._id)}
            >
              <Trash2 />
            </button>
          ])}
        />
      </section>
    </>
  );
}

function Reports() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const [dates, setDates] = useState({
    from: "",
    to: ""
  });

  const load = async () => {
    setError("");

    try {
      const { data } = await api.get("/reports/sales", {
        params: dates
      });

      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load reports.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    if (!report) return;

    const rows = [
      ["Metric", "Value"],
      ["Total sales", report.totalSales],
      ["Order count", report.orderCount],
      ...(report.popularItems || []).map((i) => [
        i.name,
        i.quantity
      ])
    ];

    const csv = rows
      .map((row) =>
        row.map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "rich-papa-sales-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle
        title="Reports & Analytics"
        action={
          <button
            className="btn secondary"
            onClick={exportCsv}
            disabled={!report}
          >
            <BarChart3 /> Export CSV
          </button>
        }
      />

      {error && <div className="alert error">{error}</div>}

      <div className="inline-form">
        <input
          type="date"
          value={dates.from}
          onChange={(e) =>
            setDates({ ...dates, from: e.target.value })
          }
        />

        <input
          type="date"
          value={dates.to}
          onChange={(e) =>
            setDates({ ...dates, to: e.target.value })
          }
        />

        <button className="btn primary" onClick={load}>
          Apply
        </button>
      </div>

      {!report && !error && <Loading />}

      {report && (
        <div className="report-layout">
          <div className="stat-grid">
            <div className="stat-card">
              <span>Total Sales</span>
              <strong>{money(report.totalSales)}</strong>
            </div>

            <div className="stat-card">
              <span>Orders</span>
              <strong>{report.orderCount}</strong>
            </div>
          </div>

          <section className="panel">
            <h3>Popular Items</h3>

            {(report.popularItems || []).map((i) => (
              <div className="list-row" key={i.name}>
                <b>{i.name}</b>
                <span>{i.quantity} sold</span>
              </div>
            ))}

            {!report.popularItems?.length && (
              <Empty text="No popular items found" />
            )}
          </section>

          <section className="panel">
            <h3>Sales by Order Type</h3>

            {(report.salesByType || []).map((i) => (
              <div className="list-row" key={i.type}>
                <b>{i.type}</b>
                <span>{money(i.sales)}</span>
              </div>
            ))}

            {!report.salesByType?.length && (
              <Empty text="No sales data found" />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, n) => (
            <tr key={n}>
              {row.map((cell, m) => (
                <td key={m}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!rows.length && <Empty text="No records" />}
    </div>
  );
}

function Loading() {
  return <div className="loading">Loading...</div>;
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
    </AuthProvider>
  );
}

