-- Migration 007: Add marital_status to patients (blood_group & genotype already exist)

ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) DEFAULT 'single' NOT NULL;

COMMENT ON COLUMN patients.marital_status IS 'Marital status: single, married, divorced, widowed';
