create table if not exists products (
  id serial primary key,
  barcode varchar(50) not null unique,
  name varchar(200) not null,
  price numeric(12,2) not null check(price >= 0),
  stock integer not null default 0 check(stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists sales (
  id bigserial primary key,
  sale_no varchar(50) not null unique,
  payment_method varchar(20) not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  received numeric(12,2) not null default 0,
  change_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists sale_items (
  id bigserial primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  product_id integer not null references products(id),
  product_name varchar(200) not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check(quantity > 0),
  line_total numeric(12,2) not null
);
insert into products(barcode,name,price,stock) values
('885000000001','ขนมปัง โฮลวีต',100,100),
('885000000002','ขนมปังกรอบ',65,100),
('885000000003','บาแก็ต (Baguette)',110,100),
('885000000004','กาแฟเย็น',55,100),
('885000000005','น้ำดื่ม 600 ml',15,200),
('885000000006','ครัวซองต์เนยสด',79,80)
on conflict(barcode) do nothing;
