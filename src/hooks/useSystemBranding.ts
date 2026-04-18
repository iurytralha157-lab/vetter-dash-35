import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  name: string;
  logoSize: number;
  loading: boolean;
}

const CACHE_KEY = 'system-branding-cache';

const readCache = (): Omit<SystemBranding, 'loading'> | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function useSystemBranding(): SystemBranding {
  const cached = readCache();

  const [logoUrl, setLogoUrl] = useState<string | null>(cached?.logoUrl ?? null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(cached?.faviconUrl ?? null);
  const [name, setName] = useState(cached?.name ?? 'MetaFlow');
  const [logoSize, setLogoSize] = useState(cached?.logoSize ?? 40);
  // Se já temos cache, não estamos "carregando" — evita o fallback "M" piscar
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('system_branding')
          .select('logo_url, favicon_url, name, logo_size')
          .limit(1)
          .single();

        if (data && !error) {
          const next = {
            logoUrl: data.logo_url,
            faviconUrl: data.favicon_url,
            name: data.name || 'MetaFlow',
            logoSize: data.logo_size || 40,
          };
          setLogoUrl(next.logoUrl);
          setFaviconUrl(next.faviconUrl);
          setName(next.name);
          setLogoSize(next.logoSize);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          } catch {
            // ignore quota errors
          }
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
