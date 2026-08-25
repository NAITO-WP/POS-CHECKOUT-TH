# POS React + Node.js + PostgreSQL

หน้า POS สำหรับระบบคิดเงิน โดยออกแบบตามภาพตัวอย่าง: สแกนบาร์โค้ด, รายการสินค้า, จำนวน, ส่วนลด, เงินรับ, เงินทอน และปุ่มคิดเงิน F9

## Stack
- React 19.2.8
- Vite 8.2.0
- Node.js 24.19.0 LTS
- Express 5.2.1
- pg 8.23.0
- PostgreSQL 18.6
- Docker Compose

## Run ด้วย Docker (แนะนำ)
ต้องมี Docker Desktop ก่อน แล้วเปิด terminal ในโฟลเดอร์นี้:

```bash
docker compose up --build
```

เปิดเว็บ: http://localhost:8080
API health: http://localhost:4000/api/health
PostgreSQL: localhost:5432 / database `posdb` / user `postgres` / password `postgres`

หยุด:
```bash
docker compose down
```

ล้างฐานข้อมูลและ seed ใหม่:
```bash
docker compose down -v
docker compose up --build
```

## Run แบบไม่ใช้ Docker
ต้องมี PostgreSQL 18 อยู่ในเครื่อง และสร้าง database `posdb` จากนั้นรัน `db/init.sql`

Terminal 1:
```bash
cd backend
npm install
npm run dev
```

Terminal 2:
```bash
cd frontend
npm install
npm run dev
```

เปิด http://localhost:5173

## API
- `GET /api/health`
- `GET /api/products`
- `GET /api/products/search?q=กาแฟ`
- `POST /api/sales`

ตัวอย่าง POST:
```json
{
  "paymentMethod": "cash",
  "discount": 10,
  "received": 500,
  "items": [{ "productId": 1, "quantity": 2 }]
}
```

## หมายเหตุ
- `db/init.sql` จะสร้างตารางและ seed สินค้าตัวอย่างเมื่อ PostgreSQL volume ถูกสร้างครั้งแรก
- ภายใน Docker API ใช้ hostname `db` ไม่ใช่ `localhost`
- UI ใช้ `/api` ผ่าน Nginx reverse proxy เมื่อรันด้วย Docker
