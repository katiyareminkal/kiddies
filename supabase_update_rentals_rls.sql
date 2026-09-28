-- Allow full public / anonymous access to rentals table in Supabase so booking rentals never fails due to RLS policies
DROP POLICY IF EXISTS "Allow public select on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow public all access on rentals" ON public.rentals;

CREATE POLICY "Allow public all access on rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);
