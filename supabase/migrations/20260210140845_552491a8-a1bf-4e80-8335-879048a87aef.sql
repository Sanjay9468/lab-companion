
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'student',
  department TEXT CHECK (department IN ('CSE', 'IT', 'AIDS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  department TEXT CHECK (department IN ('CSE', 'IT', 'AIDS')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Experiments table
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  experiment_number INT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student-subject enrollment
CREATE TABLE public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

-- Faculty-subject assignment
CREATE TABLE public.faculty_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(faculty_id, subject_id)
);

-- Experiment submissions
CREATE TABLE public.experiment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,
  language TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'evaluated')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, student_id)
);

-- Evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.experiment_submissions(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marks INT CHECK (marks >= 0 AND marks <= 100),
  feedback TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id)
);

-- Helper function: check admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Helper function: check faculty for subject
CREATE OR REPLACE FUNCTION public.is_faculty_for_subject(_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_subjects
    WHERE faculty_id = auth.uid() AND subject_id = _subject_id
  )
$$;

-- Helper function: check student for subject
CREATE OR REPLACE FUNCTION public.is_student_for_subject(_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_subjects
    WHERE student_id = auth.uid() AND subject_id = _subject_id
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'CSE')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.experiment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());

-- SUBJECTS policies
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_insert_admin" ON public.subjects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "subjects_update_admin" ON public.subjects FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "subjects_delete_admin" ON public.subjects FOR DELETE TO authenticated USING (public.is_admin());

-- EXPERIMENTS policies
CREATE POLICY "experiments_select" ON public.experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "experiments_insert" ON public.experiments FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_faculty_for_subject(subject_id));
CREATE POLICY "experiments_update" ON public.experiments FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_faculty_for_subject(subject_id));
CREATE POLICY "experiments_delete" ON public.experiments FOR DELETE TO authenticated USING (public.is_admin());

-- STUDENT_SUBJECTS policies
CREATE POLICY "student_subjects_select" ON public.student_subjects FOR SELECT TO authenticated USING (
  public.is_admin() OR student_id = auth.uid() OR public.is_faculty_for_subject(subject_id)
);
CREATE POLICY "student_subjects_insert" ON public.student_subjects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "student_subjects_delete" ON public.student_subjects FOR DELETE TO authenticated USING (public.is_admin());

-- FACULTY_SUBJECTS policies
CREATE POLICY "faculty_subjects_select" ON public.faculty_subjects FOR SELECT TO authenticated USING (
  public.is_admin() OR faculty_id = auth.uid()
);
CREATE POLICY "faculty_subjects_insert" ON public.faculty_subjects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "faculty_subjects_delete" ON public.faculty_subjects FOR DELETE TO authenticated USING (public.is_admin());

-- EXPERIMENT_SUBMISSIONS policies
CREATE POLICY "submissions_select" ON public.experiment_submissions FOR SELECT TO authenticated USING (
  public.is_admin() OR student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.experiments e
    JOIN public.faculty_subjects fs ON e.subject_id = fs.subject_id
    WHERE e.id = experiment_id AND fs.faculty_id = auth.uid()
  )
);
CREATE POLICY "submissions_insert" ON public.experiment_submissions FOR INSERT TO authenticated WITH CHECK (
  student_id = auth.uid()
);
CREATE POLICY "submissions_update" ON public.experiment_submissions FOR UPDATE TO authenticated USING (
  public.is_admin() OR student_id = auth.uid()
);

-- EVALUATIONS policies
CREATE POLICY "evaluations_select" ON public.evaluations FOR SELECT TO authenticated USING (
  public.is_admin() OR faculty_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.experiment_submissions es WHERE es.id = submission_id AND es.student_id = auth.uid()
  )
);
CREATE POLICY "evaluations_insert" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() OR (faculty_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.experiment_submissions es
    JOIN public.experiments e ON es.experiment_id = e.id
    JOIN public.faculty_subjects fs ON e.subject_id = fs.subject_id
    WHERE es.id = submission_id AND fs.faculty_id = auth.uid()
  ))
);
CREATE POLICY "evaluations_update" ON public.evaluations FOR UPDATE TO authenticated USING (
  public.is_admin() OR faculty_id = auth.uid()
);

-- Seed subjects
INSERT INTO public.subjects (name, code, department, description) VALUES
  ('Problem Solving and Python Programming', 'CS101', 'CSE', 'Fundamentals of Python programming and problem solving'),
  ('Programming in C Laboratory', 'CS102', 'CSE', 'C programming fundamentals and practices'),
  ('Data Structures Laboratory', 'CS201', 'CSE', 'Implementation of data structures in C/C++'),
  ('Object Oriented Programming Laboratory', 'CS202', 'CSE', 'OOP concepts using Java/C++'),
  ('Artificial Intelligence and Machine Learning', 'CS301', 'CSE', 'AI/ML algorithms and implementations'),
  ('Database Management Systems', 'CS302', 'CSE', 'SQL and database design'),
  ('Introduction to Operating Systems', 'CS303', 'CSE', 'OS concepts and system programming'),
  ('Computer Networks', 'CS304', 'IT', 'Network protocols and configurations'),
  ('Object Oriented Software Engineering', 'CS305', 'IT', 'Software engineering with OOP'),
  ('Neural Networks Deep Learning', 'CS401', 'AIDS', 'Deep learning architectures'),
  ('Cybersecurity', 'CS402', 'IT', 'Security principles and practices'),
  ('Mobile Application Development', 'CS403', 'IT', 'Android/iOS app development'),
  ('Virtualization', 'CS404', 'IT', 'Virtualization technologies'),
  ('Web Essentials', 'CS405', 'CSE', 'HTML, CSS, JavaScript fundamentals'),
  ('Java Programming', 'CS406', 'CSE', 'Advanced Java programming'),
  ('Systems', 'CS407', 'AIDS', 'Systems programming and design');
