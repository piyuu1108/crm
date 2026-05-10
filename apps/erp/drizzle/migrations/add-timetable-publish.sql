-- Add publish_status to divisions (draft/published)
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS publish_status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- Add color column to timetable_entries
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6366f1';
