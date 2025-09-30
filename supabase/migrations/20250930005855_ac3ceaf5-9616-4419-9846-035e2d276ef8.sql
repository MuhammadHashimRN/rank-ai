-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'recruiter');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  required_experience INTEGER NOT NULL DEFAULT 0,
  required_degree TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_name TEXT,
  parsed_email TEXT,
  parsed_phone TEXT,
  parsed_education JSONB,
  parsed_skills TEXT[] DEFAULT '{}',
  parsed_experience INTEGER,
  parsed_certifications TEXT[] DEFAULT '{}',
  parsed_projects JSONB,
  linked_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  ranking_score NUMERIC(5,2),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create ranking_logs table
CREATE TABLE public.ranking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Jobs policies
CREATE POLICY "Everyone can view jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and recruiters can create jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins and recruiters can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Resumes policies
CREATE POLICY "Admins and recruiters can view all resumes"
  ON public.resumes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins and recruiters can create resumes"
  ON public.resumes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins and recruiters can update resumes"
  ON public.resumes FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins can delete resumes"
  ON public.resumes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ranking logs policies
CREATE POLICY "Admins and recruiters can view ranking logs"
  ON public.ranking_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

CREATE POLICY "Admins and recruiters can create ranking logs"
  ON public.ranking_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter')
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign recruiter role by default (first user should be manually promoted to admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'recruiter');
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes bucket
CREATE POLICY "Authenticated users can upload resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Authenticated users can view resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes');

CREATE POLICY "Admins can delete resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    public.has_role(auth.uid(), 'admin')
  );