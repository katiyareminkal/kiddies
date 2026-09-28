-- =========================================================================
-- MASTER SUPABASE SETUP SCRIPT FOR KIDDIES STORE MANAGEMENT
-- Safe to run on both FRESH and EXISTING databases (Idempotent)
-- =========================================================================

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TABLES DEFINITION (CREATE IF NOT EXISTS)
-- =========================================================================

-- A. Users & Profiles (Store Users & Staff Accounts)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'STAFF',
  permissions TEXT[] DEFAULT '{}',
  password TEXT,
  pin TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'STAFF',
  permissions TEXT[] DEFAULT '{}',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category TEXT,
  sub_category TEXT,
  gender TEXT,
  clothing_type TEXT,
  brand TEXT,
  color TEXT,
  material TEXT,
  sizes TEXT[] DEFAULT '{}',
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  rental_price NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  sale_stock INTEGER DEFAULT 0,
  rental_stock INTEGER DEFAULT 0,
  purpose TEXT DEFAULT 'SALE',
  min_stock_alert INTEGER DEFAULT 0,
  supplier_id TEXT,
  supplier_name TEXT,
  bill_number TEXT,
  bill_date TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  store_credit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  location TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. Supplier Bills Table
CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  bill_number TEXT NOT NULL,
  date TEXT NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT,
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_type TEXT,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Supplier Bill Items Table
CREATE TABLE IF NOT EXISTS public.supplier_bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  external_order_id TEXT,
  channel TEXT DEFAULT 'IN_STORE',
  customer_id TEXT,
  total_amount NUMERIC DEFAULT 0,
  marketplace_fees NUMERIC DEFAULT 0,
  net_payout NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  payment_status TEXT,
  payment_method TEXT,
  split_payments JSONB,
  cash_tendered NUMERIC,
  change_due NUMERIC,
  order_status TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- H. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id TEXT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  returned_quantity INTEGER DEFAULT 0
);

-- I. Rentals Table
CREATE TABLE IF NOT EXISTS public.rentals (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  product_id TEXT,
  quantity INTEGER DEFAULT 1,
  start_date TIMESTAMPTZ,
  expected_return_date TIMESTAMPTZ,
  actual_return_date TIMESTAMPTZ,
  daily_rate NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  total_rent_amount NUMERIC DEFAULT 0,
  late_fee NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  payment_status TEXT,
  images TEXT[] DEFAULT '{}',
  return_images TEXT[] DEFAULT '{}',
  laundry_status TEXT DEFAULT 'NOT_REQUIRED',
  laundry_notes TEXT,
  laundry_partner TEXT,
  laundry_sent_date TIMESTAMPTZ,
  laundry_ready_date TIMESTAMPTZ,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- J. Stock Logs Table
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  pool TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reason TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- K. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'INFO',
  category TEXT DEFAULT 'SYSTEM',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  link_to TEXT
);

-- L. Credit Notes Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- M. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  product_id TEXT,
  quantity INTEGER,
  reason TEXT,
  paid_to TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- N. Store Profile Table
CREATE TABLE IF NOT EXISTS public.store_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT DEFAULT 'Kiddies',
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  website TEXT,
  logo TEXT
);

-- O. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_tax_rate NUMERIC DEFAULT 12,
  currency TEXT DEFAULT 'INR',
  enable_low_stock_alerts BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 3,
  sales_invoice_prefix TEXT DEFAULT 'INV-',
  rental_invoice_prefix TEXT DEFAULT 'RNT-',
  enable_delete_inventory BOOLEAN DEFAULT true,
  enable_delete_customers BOOLEAN DEFAULT true,
  enable_delete_transactions BOOLEAN DEFAULT true,
  enable_delete_rentals BOOLEAN DEFAULT true,
  enable_delete_suppliers BOOLEAN DEFAULT true,
  enable_delete_users BOOLEAN DEFAULT true
);

-- =========================================================================
-- 2. ENSURE ALL MISSING COLUMNS EXIST ON EXISTING TABLES
-- =========================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS clothing_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bill_number TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bill_date TEXT;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_credit NUMERIC DEFAULT 0;

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_type TEXT;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS split_payments JSONB;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS change_due NUMERIC;

ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS laundry_status TEXT DEFAULT 'NOT_REQUIRED';
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS laundry_notes TEXT;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS laundry_partner TEXT;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS laundry_sent_date TIMESTAMPTZ;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS laundry_ready_date TIMESTAMPTZ;

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES - FULL READ/WRITE ACCESS
-- Guarantees that app operations NEVER get blocked by permission errors
-- =========================================================================

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on products" ON public.products;
DROP POLICY IF EXISTS "Allow public all access on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on customers" ON public.products;
DROP POLICY IF EXISTS "Allow public all access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public all access on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all on suppliers" ON public.suppliers;
CREATE POLICY "Allow all on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- Supplier Bills
ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access on supplier_bills" ON public.supplier_bills;
DROP POLICY IF EXISTS "Allow anon full access on supplier_bills" ON public.supplier_bills;
DROP POLICY IF EXISTS "Allow public all access on supplier_bills" ON public.supplier_bills;
DROP POLICY IF EXISTS "Allow all on supplier_bills" ON public.supplier_bills;
CREATE POLICY "Allow all on supplier_bills" ON public.supplier_bills FOR ALL USING (true) WITH CHECK (true);

-- Supplier Bill Items
ALTER TABLE public.supplier_bill_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access on supplier_bill_items" ON public.supplier_bill_items;
DROP POLICY IF EXISTS "Allow anon full access on supplier_bill_items" ON public.supplier_bill_items;
DROP POLICY IF EXISTS "Allow public all access on supplier_bill_items" ON public.supplier_bill_items;
DROP POLICY IF EXISTS "Allow all on supplier_bill_items" ON public.supplier_bill_items;
CREATE POLICY "Allow all on supplier_bill_items" ON public.supplier_bill_items FOR ALL USING (true) WITH CHECK (true);

-- Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public all access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all on sales" ON public.sales;
CREATE POLICY "Allow all on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- Sale Items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow public all access on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow all on sale_items" ON public.sale_items;
CREATE POLICY "Allow all on sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- Rentals
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow public all access on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow all on rentals" ON public.rentals;
CREATE POLICY "Allow all on rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);

-- Stock Logs
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on stock_logs" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on stock_logs" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow public all access on stock_logs" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow all on stock_logs" ON public.stock_logs;
CREATE POLICY "Allow all on stock_logs" ON public.stock_logs FOR ALL USING (true) WITH CHECK (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public all access on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Credit Notes
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow public all access on credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow all on credit_notes" ON public.credit_notes;
CREATE POLICY "Allow all on credit_notes" ON public.credit_notes FOR ALL USING (true) WITH CHECK (true);

-- Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public all access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all on expenses" ON public.expenses;
CREATE POLICY "Allow all on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Store Profile
ALTER TABLE public.store_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on store_profile" ON public.store_profile;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_profile" ON public.store_profile;
DROP POLICY IF EXISTS "Allow public all access on store_profile" ON public.store_profile;
DROP POLICY IF EXISTS "Allow all on store_profile" ON public.store_profile;
CREATE POLICY "Allow all on store_profile" ON public.store_profile FOR ALL USING (true) WITH CHECK (true);

-- Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public all access on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all on settings" ON public.settings;
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Profiles & Users
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow inserts during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on users" ON public.users;
DROP POLICY IF EXISTS "Allow all public access on users" ON public.users;
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- 4. INSERT CONFIG DEFAULTS (IF NOT ALREADY PRESENT)
-- =========================================================================
INSERT INTO public.store_profile (id, store_name, address, phone, email, website)
VALUES ('default', 'Kiddies', '123 Fashion Street, City Center', '9876543210', 'contact@kiddies.store', 'www.kiddies.store')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, default_tax_rate, currency, enable_low_stock_alerts, low_stock_threshold, sales_invoice_prefix, rental_invoice_prefix)
VALUES ('default', 12, 'INR', true, 3, 'INV-', 'RNT-')
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to store-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public all on store-images" ON storage.objects;

CREATE POLICY "Allow public all on store-images"
ON storage.objects FOR ALL
USING ( bucket_id = 'store-images' )
WITH CHECK ( bucket_id = 'store-images' );
