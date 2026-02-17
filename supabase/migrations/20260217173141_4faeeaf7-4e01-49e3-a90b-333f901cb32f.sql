
-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "student_subjects_insert" ON public.student_subjects;

-- Allow students to enroll themselves (student_id must match their own uid)
CREATE POLICY "student_subjects_insert"
ON public.student_subjects
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid() OR is_admin());
