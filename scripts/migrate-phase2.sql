-- FundTrace Phase 2 Migration: Quotation, Score, Automation Tables
-- Run this in Supabase SQL Editor

-- 1. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  creator_address TEXT NOT NULL,
  purpose TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  requested_amount_ftu NUMERIC NOT NULL,
  items JSONB DEFAULT '[]',
  quotation_document_url TEXT,
  quotation_hash TEXT NOT NULL,
  on_chain_quotation_id INTEGER,
  state TEXT NOT NULL DEFAULT 'Pending',
  ai_recommendation JSONB,
  ai_recommendation_hash TEXT,
  allocated_amount_ftu NUMERIC,
  claimed_amount_ftu NUMERIC DEFAULT 0,
  claim_tx_hash TEXT,
  sanctioned_by TEXT,
  is_automated_sanction BOOLEAN DEFAULT FALSE,
  rejected_by TEXT,
  rejection_reason TEXT,
  proof_hash TEXT,
  proof_document_url TEXT,
  proof_timing TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  sanctioned_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  proof_submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_campaign ON quotations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quotations_creator ON quotations(creator_address);
CREATE INDEX IF NOT EXISTS idx_quotations_state ON quotations(state);

-- 2. CREATOR SCORES TABLE
CREATE TABLE IF NOT EXISTS creator_scores (
  id BIGSERIAL PRIMARY KEY,
  creator_address TEXT UNIQUE NOT NULL,
  current_score INTEGER NOT NULL DEFAULT 70,
  proof_completion_pct INTEGER DEFAULT 100,
  on_time_proof_pct INTEGER DEFAULT 100,
  budget_consistency_pct INTEGER DEFAULT 100,
  unresolved_requests INTEGER DEFAULT 0,
  completed_campaigns INTEGER DEFAULT 0,
  total_quotations INTEGER DEFAULT 0,
  approved_quotations INTEGER DEFAULT 0,
  total_claimed_ftu NUMERIC DEFAULT 0,
  late_proofs INTEGER DEFAULT 0,
  missing_proofs INTEGER DEFAULT 0,
  score_breakdown JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_scores_address ON creator_scores(creator_address);

-- 3. SCORE HISTORY TABLE
CREATE TABLE IF NOT EXISTS score_history (
  id BIGSERIAL PRIMARY KEY,
  creator_address TEXT NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_address ON score_history(creator_address);

-- 4. AUTOMATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS automation_settings (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INTEGER UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_by TEXT,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_campaign ON automation_settings(campaign_id);

-- 5. AUDIT EVENTS TABLE (for indexing blockchain events)
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  campaign_id INTEGER,
  quotation_id INTEGER,
  actor_address TEXT,
  amount_ftu NUMERIC,
  tx_hash TEXT,
  block_number BIGINT,
  event_data JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_campaign ON audit_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event ON audit_events(event_name);

-- 6. Update updated_at trigger (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Storage bucket (run in Supabase Dashboard or Storage API)
-- Bucket 'quotations' should be created with public read access
-- INSERT INTO storage.buckets (id, name, public) VALUES ('quotations', 'quotations', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE quotations IS 'Quotation-based fund request records. State machine: Pending → AIEvaluated → Claimable → ProofPending → ProofSubmitted → Completed';
COMMENT ON TABLE creator_scores IS 'Creator Reliability Scores — deterministic, explainable, updated after every proof/claim event';
COMMENT ON TABLE score_history IS 'Score change audit trail — every update recorded with reason';
COMMENT ON TABLE automation_settings IS 'Per-campaign automated sanction mode settings controlled by donors';
COMMENT ON TABLE audit_events IS 'Indexed blockchain event log for fast querying';
