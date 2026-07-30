-- Supabase PostgreSQL Schema Reset Script for Kiddies Store Management
-- WARNING: Running this will drop and clean all existing tables and recreate them fresh.

-- 1. DROP ALL OLD STRUCTURES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.stock_logs CASCADE;
DROP TABLE IF EXISTS public.rentals CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.store_profile CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- 2. CREATE NEW TABLES
-- A. Profiles (extending Auth Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'STAFF',
  permissions TEXT[] DEFAULT '{}',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow inserts during signup" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- B. Products Table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category TEXT,
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
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- C. Customers Table
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on customers" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- D. Suppliers Table
CREATE TABLE public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on suppliers" ON public.suppliers FOR ALL USING (auth.role() = 'authenticated');

-- E. Sales Table
CREATE TABLE public.sales (
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
  order_status TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on sales" ON public.sales FOR ALL USING (auth.role() = 'authenticated');

-- F. Sale Items Table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id TEXT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on sale_items" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on sale_items" ON public.sale_items FOR ALL USING (auth.role() = 'authenticated');

-- G. Rentals Table
CREATE TABLE public.rentals (
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
  date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on rentals" ON public.rentals FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on rentals" ON public.rentals FOR ALL USING (auth.role() = 'authenticated');

-- H. Stock Logs Table
CREATE TABLE public.stock_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  pool TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reason TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on stock_logs" ON public.stock_logs FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on stock_logs" ON public.stock_logs FOR ALL USING (auth.role() = 'authenticated');

-- I. Notifications Table
CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'INFO',
  category TEXT DEFAULT 'SYSTEM',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  link_to TEXT
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on notifications" ON public.notifications FOR ALL USING (auth.role() = 'authenticated');

-- J. Store Profile Table
CREATE TABLE public.store_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT DEFAULT 'Kiddies',
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  website TEXT,
  logo TEXT
);

ALTER TABLE public.store_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on store_profile" ON public.store_profile FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on store_profile" ON public.store_profile FOR ALL USING (auth.role() = 'authenticated');

-- K. Settings Table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_tax_rate NUMERIC DEFAULT 12,
  currency TEXT DEFAULT 'INR',
  enable_low_stock_alerts BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 3,
  sales_invoice_prefix TEXT DEFAULT 'INV-',
  rental_invoice_prefix TEXT DEFAULT 'RNT-',
  enable_delete_inventory BOOLEAN DEFAULT false,
  enable_delete_customers BOOLEAN DEFAULT false,
  enable_delete_transactions BOOLEAN DEFAULT false,
  enable_delete_suppliers BOOLEAN DEFAULT false,
  enable_delete_users BOOLEAN DEFAULT false
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on settings" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- 3. INSERT CONFIG DEFAULTS
INSERT INTO public.store_profile (id, store_name, address, phone, email, website)
VALUES ('default', 'Kiddies', '123 Fashion Street, City Center', '9876543210', 'contact@kiddies.store', 'www.kiddies.store')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, default_tax_rate, currency, enable_low_stock_alerts, low_stock_threshold, sales_invoice_prefix, rental_invoice_prefix)
VALUES ('default', 12, 'INR', true, 3, 'INV-', 'RNT-')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, permissions)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'STAFF'),
    ARRAY[]::TEXT[]
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch any errors so the user creation doesn't completely fail
  RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. WIPE OLD AUTH ENTRIES AND CREATE ACCOUNTS
DELETE FROM auth.users WHERE email IN ('admin.kiddies@gmail.com', 'staff.kiddies@gmail.com');

-- A. Create Admin Account (Password: AdminPassword123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin.kiddies@gmail.com',
  crypt('AdminPassword123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Store Admin","role":"ADMIN"}',
  'authenticated',
  'authenticated'
);

-- Override profile role configuration specifically to ADMIN
UPDATE public.profiles SET role = 'ADMIN' WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- B. Create Staff Account (Password: StaffPassword123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'staff.kiddies@gmail.com',
  crypt('StaffPassword123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Sarah Staff","role":"STAFF"}',
  'authenticated',
  'authenticated'
);

-- ==============================================================================
-- STORAGE BUCKETS & POLICIES
-- ==============================================================================

-- Create a bucket for storing product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store-images' );

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'store-images' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'store-images' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'store-images' AND auth.role() = 'authenticated' );


CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on supplier_bills" ON public.supplier_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.supplier_bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on supplier_bill_items" ON public.supplier_bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);


ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS image_url TEXT;


ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS location TEXT, ADD COLUMN IF NOT EXISTS category TEXT;


ALTER TABLE products ADD COLUMN sub_category TEXT;


ALTER TABLE products ADD COLUMN gender TEXT;


ALTER TABLE products ADD COLUMN clothing_type TEXT;
