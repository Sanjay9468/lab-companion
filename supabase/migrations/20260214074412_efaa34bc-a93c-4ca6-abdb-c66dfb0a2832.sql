
-- Add year column to profiles
ALTER TABLE public.profiles ADD COLUMN year integer;

-- Update existing profiles RLS to allow year updates
-- (profiles_update_own already allows users to update their own profile)
