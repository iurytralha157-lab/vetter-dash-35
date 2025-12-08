-- Enable RLS on client_onboarding table
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to INSERT into client_onboarding
CREATE POLICY "Public can insert onboarding data"
ON public.client_onboarding
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view onboarding data
CREATE POLICY "Admins can view all onboarding data"
ON public.client_onboarding
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can update onboarding data
CREATE POLICY "Admins can update onboarding data"
ON public.client_onboarding
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can delete onboarding data
CREATE POLICY "Admins can delete onboarding data"
ON public.client_onboarding
FOR DELETE
USING (public.is_admin(auth.uid()));