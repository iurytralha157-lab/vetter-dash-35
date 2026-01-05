import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrganizationBranding {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarLogoUrl: string | null;
  faviconUrl: string | null;
  welcomeMessage: string;
}

export function useOrganizationBranding() {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Buscar organization_id do perfil do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          setLoading(false);
          return;
        }

        // Buscar dados da organização
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (org) {
          setBranding({
            id: org.id,
            name: org.name,
            primaryColor: org.primary_color || '#10b981',
            secondaryColor: org.secondary_color || '#059669',
            sidebarLogoUrl: org.sidebar_logo_url,
            faviconUrl: org.favicon_url,
            welcomeMessage: org.welcome_message || 'Bem-vindo ao painel!',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, []);

  return { branding, loading };
}
