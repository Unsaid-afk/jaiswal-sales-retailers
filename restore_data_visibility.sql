
-- Run this in your Supabase SQL Editor to restore data visibility

-- Option 1: Disable RLS completely (Simplest for now)
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items DISABLE ROW LEVEL SECURITY;

-- Option 2: If you WANT RLS enabled, run these instead to allow public read access:
-- CREATE POLICY "Allow Public Read Vendors" ON vendors FOR SELECT USING (true);
-- CREATE POLICY "Allow Public Read Items" ON items FOR SELECT USING (true);
-- CREATE POLICY "Allow Public Read Routes" ON routes FOR SELECT USING (true);
-- CREATE POLICY "Allow Public Read Bills" ON bills FOR SELECT USING (true);
-- CREATE POLICY "Allow Public Read Bill Items" ON bill_items FOR SELECT USING (true);
