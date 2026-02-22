-- Add 'public' to doc_visibility (must be in its own migration so the value is committed before use)
ALTER TYPE doc_visibility ADD VALUE IF NOT EXISTS 'public';
