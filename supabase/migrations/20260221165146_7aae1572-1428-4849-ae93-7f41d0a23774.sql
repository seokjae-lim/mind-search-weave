-- Add unique constraint for upsert on section_id + deliverable_type
CREATE UNIQUE INDEX idx_deliverables_section_type ON public.deliverables(section_id, deliverable_type);
