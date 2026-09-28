-- =========================================================================
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR (PROJECT -> SQL EDITOR)
-- Fixes all tables, adds missing columns, and enables full read/write RLS
-- Safe to run on existing data: does NOT drop tables or delete data.
-- =========================================================================

-- 1. Ensure all columns exist across all tables
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

-- 2. Clean and re-grant full RLS access for both authenticated and anon roles

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

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow inserts during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Users (Staff & Store Accounts)
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
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on users" ON public.users;
DROP POLICY IF EXISTS "Allow all public access on users" ON public.users;
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

