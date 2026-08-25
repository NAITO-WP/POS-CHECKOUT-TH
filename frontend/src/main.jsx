import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "/api";
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [received, setReceived] = useState(500);
  const [discount, setDiscount] = useState(21);
  const [payment, setPayment] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const barcodeRef = useRef(null);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change = Math.max(0, Number(received || 0) - total);

  const loadProducts = async () => {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error("โหลดสินค้าไม่สำเร็จ");
    setProducts(await res.json());
  };

  useEffect(() => {
    loadProducts().catch(() =>
      setMessage("เชื่อมต่อ API ไม่สำเร็จ — ลองเปิด docker compose ใหม่"),
    );
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F9") {
        e.preventDefault();
        document.getElementById("payment-btn")?.focus();
      }
      if (e.key === "Escape") {
        setBarcode("");
        barcodeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addProduct = (product) => {
    setCart((prev) => {
      const found = prev.find((x) => x.id === product.id);
      if (found)
        return prev.map((x) =>
          x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      return [...prev, { ...product, quantity: 1 }];
    });
    setBarcode("");
    barcodeRef.current?.focus();
  };

  const scan = () => {
    const value = barcode.trim().toLowerCase();
    if (!value) return;
    const product = products.find(
      (p) =>
        p.barcode.toLowerCase() === value ||
        p.name.toLowerCase().includes(value),
    );
    if (!product) {
      setMessage(`ไม่พบสินค้า: ${barcode}`);
      return;
    }
    setMessage("");
    addProduct(product);
  };

  const updateQty = (id, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart((prev) =>
      prev.map((x) => (x.id === id ? { ...x, quantity: qty } : x)),
    );
  };

  const remove = (id) => setCart((prev) => prev.filter((x) => x.id !== id));

  const checkout = async () => {
    if (!cart.length) return setMessage("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    if (payment === "cash" && Number(received) < total)
      return setMessage("จำนวนเงินรับไม่พอ");
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: payment,
          discount: Number(discount || 0),
          received: Number(received || 0),
          items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "ชำระเงินไม่สำเร็จ");
      setMessage(`ชำระเงินสำเร็จ • ใบเสร็จ ${data.saleNo}`);
      setCart([]);
      setDiscount(0);
      setReceived(0);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
      barcodeRef.current?.focus();
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="hamburger">☰</div>
        <div className="brand">🛒 หน้าร้าน</div>
        <nav>
          <span>◈ สินค้า</span>
          <span>▥ บาร์โค้ด</span>
          <span>⌁ รายงาน</span>
        </nav>
        <div className="top-actions">
          <b>สาขา 00000</b>
          <span>⛶</span>
          <span>☷</span>
          <span>⏻</span>
        </div>
      </header>

      <section className="terminal-head">
        <div>
          🛒 บิล : <strong>10125354</strong> &nbsp; 👤{" "}
          <strong>C0010:จิตรา น้ำใจงาม</strong>
        </div>
        <div className="terminal-icons">◉ &nbsp; ↻</div>
      </section>

      <main className="workspace">
        <section className="entry-area">
          <div className="barcode-row">
            <label>รหัสบาร์โค้ด :</label>
            <span className="barcode-code">{barcode || "12"}</span>
          </div>
          <div className="scan-row">
            <input
              ref={barcodeRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scan()}
              placeholder="สแกนหรือพิมพ์บาร์โค้ดแล้วกด Enter"
            />
            <button className="search-btn" onClick={scan}>
              ⌕ <span>ส่ง</span>
            </button>
            <div className="summary-chip">
              <small>รวม</small>
              <strong>฿ {money(total)}</strong>
            </div>
            <button
              id="payment-btn"
              className="payment-btn"
              onClick={checkout}
              disabled={loading}
            >
              ▣ (F9)
            </button>
            <button className="pay-label" onClick={checkout}>
              คิดเงิน
            </button>
          </div>
          <div className="money-row">
            <div className="money-box">
              <span>รับเงิน</span>
              <input
                type="number"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              <button onClick={() => setReceived(total)}>รับเต็ม</button>
            </div>
            <div className="money-box discount">
              <span>ส่วนลด</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="money-box change">
              <span>เงินทอน</span>
              <strong>{money(change)}</strong>
            </div>
          </div>
        </section>

        <section className="cart-section">
          <div className="cart-head">
            <span>#</span>
            <span>รายการ</span>
            <span>ราคา</span>
            <span>จำนวน</span>
            <span>เป็นเงิน</span>
            <span></span>
          </div>
          <div className="cart-body">
            {!cart.length ? (
              <div className="empty">
                <div>🧾</div>
                <strong>ยังไม่มีสินค้าในบิล</strong>
                <small>สแกนบาร์โค้ดหรือพิมพ์ชื่อสินค้าเพื่อเพิ่มรายการ</small>
              </div>
            ) : (
              cart
                .slice()
                .reverse()
                .map((item, idx) => (
                  <div className="cart-line" key={item.id}>
                    <span>{cart.length - idx}</span>
                    <span className="product-name">{item.name}</span>
                    <span>{money(item.price)}</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQty(item.id, e.target.value)}
                    />
                    <strong>{money(item.price * item.quantity)}</strong>
                    <button className="delete" onClick={() => remove(item.id)}>
                      ×
                    </button>
                  </div>
                ))
            )}
            <div className="watermark">POS TERMINAL</div>
          </div>
        </section>

        <section className="bottom-bar">
          <div className="payment-type">
            <label>ประเภท :</label>
            <label>
              <input
                type="radio"
                checked={payment === "cash"}
                onChange={() => setPayment("cash")}
              />{" "}
              เงินสด
            </label>
            <label>
              <input
                type="radio"
                checked={payment === "credit"}
                onChange={() => setPayment("credit")}
              />{" "}
              สินเชื่อ
            </label>
          </div>
          <div className="printer">
            <input type="checkbox" defaultChecked /> พิมพ์บิล{" "}
            <span>บิลเล็ก 80 mm</span>
          </div>
          <div className="status">
            รายการในฐานข้อมูล: {products.length} รายการ
          </div>
        </section>
      </main>
      {message && (
        <div className="toast" onClick={() => setMessage("")}>
          {message}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
