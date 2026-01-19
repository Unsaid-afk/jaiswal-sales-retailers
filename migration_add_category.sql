-- Add category column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('Fryums', 'Namkeen', 'Others'));

-- Ensure existing items have a default category if null
UPDATE items 
SET category = 'Others' 
WHERE category IS NULL;
