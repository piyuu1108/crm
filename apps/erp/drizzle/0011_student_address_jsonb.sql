-- Migration: Convert students.address from text → jsonb
-- Non-destructive: old column renamed, new column added, data migrated.
-- Step 4 (drop old column) is commented out — run manually after verification.

-- Step 1: Rename old text column to keep data safe
ALTER TABLE students RENAME COLUMN address TO address_old;

-- Step 2: Add new JSONB column
ALTER TABLE students ADD COLUMN address jsonb;

-- Step 3: Migrate existing text data into JSONB shape
-- Wraps any existing text value as a "home" address in the current block.
UPDATE students
SET address = jsonb_build_object(
  'current', jsonb_build_object(
    'line1',   COALESCE(NULLIF(TRIM(address_old), ''), ''),
    'city',    '',
    'pincode', '',
    'kind',    'home'
  )
)
WHERE address_old IS NOT NULL AND TRIM(address_old) <> '';

-- Step 4 (run manually after verifying production data):
-- ALTER TABLE students DROP COLUMN address_old;
