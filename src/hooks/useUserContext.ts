import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = 'admin' | 'gestor' | 'usuario' | null;
export type UserStatus = 'pending' | 'active' | 'blocked' | null;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  plan: string;
}

export interface UserContext {
  role: UserRole;
  status: UserStatus;
  userId: string | null;
  organizationId: string | null;
  organization: Organization | null;
  loading: boolean;
  isVetterAdmin: boolean;
  isOrgAdmin: boolean;
  isActive: boolean;
  isPending: boolean;
  isBlocked: boolean;
  refetch: () => Promise<void>;
}

export function useUserContext(): UserContext {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [status, setStatus] = useState<UserStatus>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserContext = async () => {
    if (!user) {
      setRole(null);
      setStatus(null);
      setOrganizationId(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    try {
      // Load profile data (status and organization_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, organization_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStatus((profile.status as UserStatus) || 'pending');
        setOrganizationId(profile.organization_id);

        // Load organization if user has one
        if (profile.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();
          
          if (org) {
            setOrganization(org as Organization);
          }
        }
      } else {
        setStatus('pending');
      }

      // Check role using existing RPC functions
      const { data: isAdminRes } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (isAdminRes === true) {
        setRole('admin');
      } else {
        const { data: isGestorRes } = await supabase.rpc('is_gestor', { _user_id: user.id });
        if (isGestorRes === true) {
          setRole('gestor');
        } else {
          setRole('usuario');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar contexto do usuário:', error);
      setRole('usuario');
      setStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserContext();
  }, [user]);

  return {
    role,
    status,
    userId: user?.id || null,
    organizationId,
    organization,
    loading,
    isVetterAdmin: role === 'admin',
    isOrgAdmin: role === 'gestor',
    isActive: status === 'active',
    isPending: status === 'pending',
    isBlocked: status === 'blocked',
    refetch: loadUserContext,
  };
}
