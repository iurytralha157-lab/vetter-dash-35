-- =============================================
-- FASE 1: Multi-Tenant Foundation + Approval System
-- =============================================

-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  webhook_url text,
  webhook_secret text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add multi-tenant and approval columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN status text DEFAULT 'pending',
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid;

-- Add check constraint for status
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('pending', 'active', 'blocked'));

-- 3. Create helper functions for RLS

-- Check if user is a Vetter admin (full access) - uses existing 'admin' role
CREATE OR REPLACE FUNCTION public.is_vetter_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Get user's status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(status, 'pending') FROM public.profiles WHERE id = _user_id
$$;

-- Check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'gestor'
  )
$$;

-- 4. RLS Policies for organizations

-- Vetter admins can do everything
CREATE POLICY "Vetter admins full access on organizations"
ON public.organizations FOR ALL
USING (is_vetter_admin(auth.uid()))
WITH CHECK (is_vetter_admin(auth.uid()));

-- Users can view their own organization
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (id = get_user_org(auth.uid()));

-- 5. Create trigger for updated_at on organizations
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_organizations_updated_at();

-- 6. Create indexes for better performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- 7. Update existing admin users to have status 'active'
UPDATE public.profiles 
SET status = 'active' 
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);