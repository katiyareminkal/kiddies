-- =========================================================================
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR
-- Fixes Row Level Security (RLS) for rentals & all store tables
-- =========================================================================

-- 1. Rentals Table RLS
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow public all access on rentals" ON public.rentals;
CREATE POLICY "Allow public all access on rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);

-- 2. Products Table RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on products" ON public.products;
DROP POLICY IF EXISTS "Allow public all access on products" ON public.products;
CREATE POLICY "Allow public all access on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 3. Customers Table RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public all access on customers" ON public.customers;
CREATE POLICY "Allow public all access on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 4. Sales Table RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public all access on sales" ON public.sales;
CREATE POLICY "Allow public all access on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- 5. Sale Items Table RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow public all access on sale_items" ON public.sale_items;
CREATE POLICY "Allow public all access on sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Stock Logs Table RLS
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on stock_logs" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on stock_logs" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow public all access on stock_logs" ON public.stock_logs;
CREATE POLICY "Allow public all access on stock_logs" ON public.stock_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Notifications Table RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public all access on notifications" ON public.notifications;
CREATE POLICY "Allow public all access on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 8. Suppliers Table RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public all access on suppliers" ON public.suppliers;
CREATE POLICY "Allow public all access on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- 9. Supplier Bills Table RLS
ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access on supplier_bills" ON public.supplier_bills;
DROP POLICY IF EXISTS "Allow public all access on supplier_bills" ON public.supplier_bills;
CREATE POLICY "Allow public all access on supplier_bills" ON public.supplier_bills FOR ALL USING (true) WITH CHECK (true);

-- 10. Supplier Bill Items Table RLS
ALTER TABLE public.supplier_bill_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access on supplier_bill_items" ON public.supplier_bill_items;
DROP POLICY IF EXISTS "Allow public all access on supplier_bill_items" ON public.supplier_bill_items;
CREATE POLICY "Allow public all access on supplier_bill_items" ON public.supplier_bill_items FOR ALL USING (true) WITH CHECK (true);

-- 11. Credit Notes Table RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on credit_notes" ON public.credit_notes;
CREATE POLICY "Allow public all access on credit_notes" ON public.credit_notes FOR ALL USING (true) WITH CHECK (true);

-- 12. Expenses Table RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on expenses" ON public.expenses;
CREATE POLICY "Allow public all access on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
