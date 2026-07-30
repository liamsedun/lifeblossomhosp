-- Migration 001: Add available_from / available_until to staff table
-- Run this in Supabase SQL Editor if you used the original database/schema.sql
-- which was missing these columns.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS available_from TIME,
  ADD COLUMN IF NOT EXISTS available_until TIME;
