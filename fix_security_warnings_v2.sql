
-- 1. FIX RLS POLICIES (Safe to re-run)
-- We re-run these just to be 100% sure the first part of the previous script finished.

-- Enable RLS
ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bill_items" ENABLE ROW LEVEL SECURITY;

-- Re-create "Allow All" policies
DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."vendors";
CREATE POLICY "Enable read/write for all" ON "public"."vendors" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."items";
CREATE POLICY "Enable read/write for all" ON "public"."items" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."routes";
CREATE POLICY "Enable read/write for all" ON "public"."routes" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."bills";
CREATE POLICY "Enable read/write for all" ON "public"."bills" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."bill_items";
CREATE POLICY "Enable read/write for all" ON "public"."bill_items" FOR ALL USING (true) WITH CHECK (true);


-- 2. FIX FUNCTION SECURITY (Corrected with specific arguments)
-- We specify (uuid, date, jsonb) so Postgres knows EXACTLY which function to update.

ALTER FUNCTION "public"."create_bill_with_items"(uuid, date, jsonb) SET search_path = public;
