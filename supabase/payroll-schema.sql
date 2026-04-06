-- Jacob Co Payroll Module — Database Schema
-- Run this in your Supabase SQL editor AFTER the main schema.sql

-- ============================================================
-- PAYROLL SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL CHECK (employee_role IN ('Lead Tech', 'Assistant Tech / Other')),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  events_count INTEGER NOT NULL DEFAULT 0,
  events_description TEXT,
  shop_hours_type TEXT NOT NULL DEFAULT 'none'
    CHECK (shop_hours_type IN ('workforce', 'manual', 'none')),
  shop_hours_manual NUMERIC(8,2),
  shop_hours_note TEXT,
  general_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'needs_followup')),
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYROLL REIMBURSEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES payroll_submissions(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  receipt_url TEXT NOT NULL,
  receipt_storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_reimbursements_submission
  ON payroll_reimbursements(submission_id);

CREATE INDEX IF NOT EXISTS idx_payroll_submissions_period
  ON payroll_submissions(pay_period_start, pay_period_end);

-- ============================================================
-- RLS — Open policies (same pattern as board tables)
-- All real access control is handled at the application layer
-- ============================================================
ALTER TABLE payroll_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_payroll_submissions"
  ON payroll_submissions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public_all_payroll_reimbursements"
  ON payroll_reimbursements FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET: payroll-receipts
-- Also fix card-images to be public (if not already)
-- Run these in the Supabase SQL editor
-- ============================================================

-- Make card-images bucket public (fixes photo display bug)
UPDATE storage.buckets SET public = true WHERE id = 'card-images';

-- Create payroll-receipts bucket as public
-- (random UUID paths make receipts non-guessable)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payroll-receipts',
  'payroll-receipts',
  true,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/gif','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to upload to payroll-receipts
-- (downloads are public due to bucket being public)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Allow public uploads to payroll-receipts',
  'payroll-receipts',
  'INSERT',
  'true'
)
ON CONFLICT DO NOTHING;
