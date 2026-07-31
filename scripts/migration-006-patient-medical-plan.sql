-- Migration 006: Add medical_plan to patients (Individual / Family / Organisation / HMO)

ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_plan VARCHAR(20) DEFAULT 'individual' NOT NULL;

COMMENT ON COLUMN patients.medical_plan IS 'Medical plan type: individual, family, organisation, hmo';
