-- 1. Create supplier_bills table
CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;

-- 2. Create supplier_bill_items table
CREATE TABLE IF NOT EXISTS public.supplier_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_bill_items ENABLE ROW LEVEL SECURITY;

-- 3. Safely create policies without DROP
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated full access on supplier_bills') THEN
        CREATE POLICY "Allow authenticated full access on supplier_bills" ON public.supplier_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access on supplier_bills') THEN
        CREATE POLICY "Allow anon full access on supplier_bills" ON public.supplier_bills FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated full access on supplier_bill_items') THEN
        CREATE POLICY "Allow authenticated full access on supplier_bill_items" ON public.supplier_bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access on supplier_bill_items') THEN
        CREATE POLICY "Allow anon full access on supplier_bill_items" ON public.supplier_bill_items FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Optional Columns for Tax and Discount
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS subtotal NUMERIC;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_value NUMERIC;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_type TEXT;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE public.supplier_bills ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
