-- Create skill_synonyms table for normalizing skills
CREATE TABLE public.skill_synonyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_skill TEXT NOT NULL,
  synonym TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(synonym)
);

-- Enable RLS
ALTER TABLE public.skill_synonyms ENABLE ROW LEVEL SECURITY;

-- Everyone can read skill synonyms
CREATE POLICY "Everyone can view skill synonyms"
  ON public.skill_synonyms
  FOR SELECT
  USING (true);

-- Only admins can manage skill synonyms
CREATE POLICY "Admins can manage skill synonyms"
  ON public.skill_synonyms
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_skill_synonyms_synonym ON public.skill_synonyms(synonym);
CREATE INDEX idx_skill_synonyms_canonical ON public.skill_synonyms(canonical_skill);

-- Seed with common skill variations
INSERT INTO public.skill_synonyms (canonical_skill, synonym) VALUES
  ('React', 'React.js'),
  ('React', 'ReactJS'),
  ('React', 'react'),
  ('JavaScript', 'JS'),
  ('JavaScript', 'Javascript'),
  ('JavaScript', 'javascript'),
  ('TypeScript', 'TS'),
  ('TypeScript', 'Typescript'),
  ('Node.js', 'NodeJS'),
  ('Node.js', 'Node'),
  ('Python', 'python'),
  ('Java', 'java'),
  ('C++', 'CPP'),
  ('C++', 'Cpp'),
  ('PostgreSQL', 'Postgres'),
  ('PostgreSQL', 'postgres'),
  ('MongoDB', 'Mongo'),
  ('MongoDB', 'mongo'),
  ('Docker', 'docker'),
  ('Kubernetes', 'K8s'),
  ('Kubernetes', 'k8s'),
  ('AWS', 'Amazon Web Services'),
  ('GCP', 'Google Cloud Platform'),
  ('CI/CD', 'Continuous Integration'),
  ('Machine Learning', 'ML'),
  ('Artificial Intelligence', 'AI'),
  ('HTML', 'html'),
  ('CSS', 'css'),
  ('SQL', 'sql');

-- Create function to normalize a skill
CREATE OR REPLACE FUNCTION normalize_skill(skill_name TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- Try to find canonical form
  SELECT canonical_skill INTO normalized
  FROM skill_synonyms
  WHERE LOWER(synonym) = LOWER(skill_name)
  LIMIT 1;
  
  -- If found, return canonical, otherwise return original trimmed
  RETURN COALESCE(normalized, TRIM(skill_name));
END;
$$ LANGUAGE plpgsql STABLE;