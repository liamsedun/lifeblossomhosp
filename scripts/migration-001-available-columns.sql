-- Migration 001: Fix staff table columns
-- Run this in Supabase SQL Editor

-- Rename available → is_available to match the frontend/API code
ALTER TABLE staff RENAME COLUMN available TO is_available;

-- Add available_from / available_until (if missing from original schema)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS available_from TIME,
  ADD COLUMN IF NOT EXISTS available_until TIME;
