-- Add optional section_id column to deliverables for proposal workflow integration
ALTER TABLE public.deliverables
ADD COLUMN section_id uuid REFERENCES public.proposal_sections(id) ON DELETE CASCADE;

-- Make requirement_id nullable since deliverables can come from proposal sections
ALTER TABLE public.deliverables
ALTER COLUMN requirement_id DROP NOT NULL;

-- Create index for section_id lookups
CREATE INDEX idx_deliverables_section_id ON public.deliverables(section_id);
