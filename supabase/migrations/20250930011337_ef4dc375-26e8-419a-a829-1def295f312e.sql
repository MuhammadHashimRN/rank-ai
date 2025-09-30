-- Allow both admins and recruiters to delete jobs (not just admins)
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;

CREATE POLICY "Admins and recruiters can delete jobs" 
ON public.jobs 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recruiter'::app_role)
);