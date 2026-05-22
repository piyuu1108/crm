-- Migration: Consolidate faculty sub-tables into the main faculty table.
-- Adds address (jsonb), alternate_mobile, and profile_photo_url to faculty.
-- Back-fills from sub-tables, then drops them.

-- Step 1: Add new columns to faculty (idempotent)
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS alternate_mobile varchar(15);
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS profile_photo_url varchar(255);

-- Step 2: Back-fill profile_photo_url from faculty_documents
UPDATE faculty f
SET profile_photo_url = fd.profile_photo_url
FROM faculty_documents fd
WHERE fd.faculty_id = f.id
  AND fd.profile_photo_url IS NOT NULL;

-- Step 3: Back-fill alternate_mobile from faculty_contact_info
UPDATE faculty f
SET alternate_mobile = fci.alternate_mobile
FROM faculty_contact_info fci
WHERE fci.faculty_id = f.id
  AND fci.alternate_mobile IS NOT NULL;

-- Step 4: Back-fill address JSONB from faculty_contact_info.address (plain text)
UPDATE faculty f
SET address = jsonb_build_object(
  'line1',   COALESCE(NULLIF(TRIM(fci.address), ''), ''),
  'city',    '',
  'pincode', '',
  'kind',    'home'
)
FROM faculty_contact_info fci
WHERE fci.faculty_id = f.id
  AND fci.address IS NOT NULL AND TRIM(fci.address) <> '';

-- Step 5: Back-fill personal/contact/professional data (safety net — faculty table
--         already mirrors these fields but sub-tables may have newer values)
UPDATE faculty f
SET
  name             = COALESCE(fpi.full_name, f.name),
  dob              = COALESCE(fpi.dob,       f.dob),
  gender           = COALESCE(fpi.gender,    f.gender),
  mobile           = COALESCE(fci.mobile,    f.mobile),
  qualification    = COALESCE(fpro.qualification,    f.qualification),
  experience_years = COALESCE(fpro.experience_years, f.experience_years),
  specialization   = COALESCE(fpro.specialization,   f.specialization),
  designation      = COALESCE(fpro.designation,      f.designation)
FROM faculty_personal_info fpi
LEFT JOIN faculty_contact_info fci       ON fci.faculty_id  = fpi.faculty_id
LEFT JOIN faculty_professional_info fpro ON fpro.faculty_id = fpi.faculty_id
WHERE fpi.faculty_id = f.id;

-- Step 6: Drop the four sub-tables
DROP TABLE IF EXISTS faculty_documents;
DROP TABLE IF EXISTS faculty_professional_info;
DROP TABLE IF EXISTS faculty_contact_info;
DROP TABLE IF EXISTS faculty_personal_info;
