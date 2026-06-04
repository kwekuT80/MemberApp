-- Financial Audit Trail Schema
-- Tracks who changed payment amounts and rate configurations

CREATE TABLE IF NOT EXISTS financial_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'payment_amount_change', 'rate_change', 'assessment_edit', 'payment_delete'
    entity_type TEXT NOT NULL, -- 'payment', 'rate', 'assessment'
    entity_id UUID NOT NULL, -- ID of the changed record
    member_id UUID REFERENCES members(id),

    -- Before and after values (JSONB for flexibility)
    old_values JSONB,
    new_values JSONB,

    -- Who made the change
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit grants required for RLS to work — without these, tables are inaccessible
GRANT SELECT, INSERT ON TABLE financial_audit_log TO authenticated;

-- RLS Policies
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial registrars can read audit log"
    ON financial_audit_log FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

-- Service role can insert (for automated logging)
CREATE POLICY "Service role can insert audit entries"
    ON financial_audit_log FOR INSERT
    WITH CHECK (true);

-- Indexes for common query patterns
CREATE INDEX idx_audit_member_changed_at ON financial_audit_log (member_id, changed_at DESC);
CREATE INDEX idx_audit_entity ON financial_audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_action ON financial_audit_log (action, changed_at DESC);
CREATE INDEX idx_audit_changed_by ON financial_audit_log (changed_by, changed_at DESC);

-- View for easier querying of recent activity
CREATE OR REPLACE VIEW audit_recent_activity AS
SELECT
    fal.id,
    fal.action,
    fal.entity_type,
    fal.member_id,
    m.first_name || ' ' || m.surname as member_name,
    p.email as changed_by_email,
    pr.role as changed_by_role,
    fal.changed_at,
    jsonb_build_object(
        'old', fal.old_values,
        'new', fal.new_values
    ) as value_changes
FROM financial_audit_log fal
LEFT JOIN members m ON fal.member_id = m.id
LEFT JOIN profiles p ON fal.changed_by = p.id
LEFT JOIN profiles pr ON fal.changed_by = pr.id
ORDER BY fal.changed_at DESC;

-- Explicit grants for view
GRANT SELECT ON VIEW audit_recent_activity TO authenticated;

-- RLS on view
CREATE POLICY "Financial registrars can read recent activity"
    ON audit_recent_activity FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));
