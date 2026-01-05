import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemBranding {
  logoUrl: string | null;
  name: string;
  loading: boolean;
}

export function useSystemBranding(): SystemBranding {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState('MetaFlow');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('system_branding')
          .select('logo_url, name')
          .limit(1)
          .single();

        if (data && !error) {
          setLogoUrl(data.logo_url);
          setName(data.name || 'MetaFlow');
        }
      } catch (err) {
        console.error('Error fetching system branding:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { logoUrl, name, loading };
}
