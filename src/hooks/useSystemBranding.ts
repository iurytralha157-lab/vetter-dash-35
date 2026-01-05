import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  name: string;
  logoSize: number;
  loading: boolean;
}

export function useSystemBranding(): SystemBranding {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [name, setName] = useState('MetaFlow');
  const [logoSize, setLogoSize] = useState(40);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('system_branding')
          .select('logo_url, favicon_url, name, logo_size')
          .limit(1)
          .single();

        if (data && !error) {
          setLogoUrl(data.logo_url);
          setFaviconUrl(data.favicon_url);
          setName(data.name || 'MetaFlow');
          setLogoSize(data.logo_size || 40);
        }
      } catch (err) {
        console.error('Error fetching system branding:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { logoUrl, faviconUrl, name, logoSize, loading };
}
