-- Drop existing validation constraint if needed (safe to run)
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;

-- Add updated check constraint to allow 'Fryums', 'Farshan', 'Namkeen', and 'Others'
ALTER TABLE items 
ADD CONSTRAINT items_category_check 
CHECK (category IN ('Fryums', 'Farshan', 'Namkeen', 'Others'));

-- Ensure existing items with NULL category are 'Others'
UPDATE items 
SET category = 'Others' 
WHERE category IS NULL;
