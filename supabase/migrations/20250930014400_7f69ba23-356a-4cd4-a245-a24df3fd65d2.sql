-- Create candidate_notes table for collaboration
CREATE TABLE public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

-- Policies for notes
CREATE POLICY "Users can view notes on resumes they can access"
ON public.candidate_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recruiter'::app_role)
);

CREATE POLICY "Users can create notes"
ON public.candidate_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recruiter'::app_role))
);

CREATE POLICY "Users can update their own notes"
ON public.candidate_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.candidate_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create candidate_favorites table
CREATE TABLE public.candidate_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resume_id, user_id)
);

-- Enable RLS
ALTER TABLE public.candidate_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for favorites
CREATE POLICY "Users can view their own favorites"
ON public.candidate_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
ON public.candidate_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.candidate_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating notes timestamp
CREATE TRIGGER update_candidate_notes_updated_at
BEFORE UPDATE ON public.candidate_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();