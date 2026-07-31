-- ============================================================================
-- MIGRATION 005: Medical Invoice enhancements
-- Adds attending staff + per-line-item VAT to invoices for the medical
-- invoice layout (header info, bill-to, attending clinician, VAT columns).
-- ============================================================================

-- 1. Attending staff (doctor/nurse/admin who rendered the service)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS attending_staff_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_attending ON invoices (attending_staff_id);

-- 2. Per-item VAT on invoice items
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount   NUMERIC(12,2) NOT NULL DEFAULT 0;
