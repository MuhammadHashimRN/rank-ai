-- Fix search path for normalize_skill function
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
$$ LANGUAGE plpgsql STABLE SET search_path = public;