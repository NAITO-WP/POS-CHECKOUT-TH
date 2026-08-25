import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/posdb",
  max: 10,
  idleTimeoutMillis: 30000,
});

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ status: "ok", database: "connected" });
  } catch (e) {
    res.status(503).json({ status: "error", message: e.message });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "select id, barcode, name, price, stock from products where active=true order by id",
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/products/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  try {
    const { rows } = await pool.query(
      `select id, barcode, name, price, stock from products where active=true and (barcode ilike $1 or name ilike $1) order by name limit 20`,
      [`%${q}%`],
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/sales", async (req, res) => {
  const {
    paymentMethod = "cash",
    discount = 0,
    received = 0,
    items = [],
  } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "items is required" });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const ids = items.map((x) => Number(x.productId));
    const { rows: products } = await client.query(
      "select id, name, price, stock from products where id = any($1::int[]) for update",
      [ids],
    );
    if (products.length !== ids.length) throw new Error("ไม่พบสินค้าบางรายการ");
    let subtotal = 0;
    for (const item of items) {
      const p = products.find((x) => x.id === Number(item.productId));
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1)
        throw new Error("จำนวนสินค้าไม่ถูกต้อง");
      if (p.stock < qty) throw new Error(`สินค้า ${p.name} มีสต็อกไม่พอ`);
      subtotal += Number(p.price) * qty;
    }
    const safeDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal));
    const total = subtotal - safeDiscount;
    if (paymentMethod === "cash" && Number(received) < total)
      throw new Error("จำนวนเงินรับไม่พอ");
    const saleNo = `S${Date.now()}`;
    const sale = await client.query(
      "insert into sales(sale_no, payment_method, subtotal, discount, total, received, change_amount) values($1,$2,$3,$4,$5,$6,$7) returning id,sale_no,total,change_amount",
      [
        saleNo,
        paymentMethod,
        subtotal,
        safeDiscount,
        total,
        Number(received) || 0,
        Math.max(0, (Number(received) || 0) - total),
      ],
    );
    for (const item of items) {
      const p = products.find((x) => x.id === Number(item.productId));
      const qty = Number(item.quantity);
      await client.query(
        "insert into sale_items(sale_id, product_id, product_name, unit_price, quantity, line_total) values($1,$2,$3,$4,$5,$6)",
        [sale.rows[0].id, p.id, p.name, p.price, qty, Number(p.price) * qty],
      );
      await client.query("update products set stock=stock-$1 where id=$2", [
        qty,
        p.id,
      ]);
    }
    await client.query("commit");
    res.status(201).json(sale.rows[0]);
  } catch (e) {
    await client.query("rollback");
    res.status(400).json({ message: e.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => console.log(`POS API listening on :${port}`));
