-- Allow admins and recruiters to delete ranking logs
CREATE POLICY "Admins and recruiters can delete ranking logs"
ON public.ranking_logs
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recruiter'::app_role)
);

-- Update resumes delete policy to allow recruiters
DROP POLICY IF EXISTS "Admins can delete resumes" ON public.resumes;

CREATE POLICY "Admins and recruiters can delete resumes"
ON public.resumes
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recruiter'::app_role)
);