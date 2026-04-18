import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'gestor' | 'usuario' | null;

const ROLE_CACHE_KEY = 'user-role-cache';

interface RoleCache {
  userId: string;
  role: UserRole;
}

const getCachedRole = (): RoleCache | null => {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function useUserRole() {
  const cached = getCachedRole();
  const [role, setRole] = useState<UserRole>(cached?.role ?? null);
  const [loading, setLoading] = useState(!cached);
  const [userId, setUserId] = useState<string | null>(cached?.userId ?? null);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setUserId(null);
          localStorage.removeItem(ROLE_CACHE_KEY);
          setLoading(false);
          return;
        }
        setUserId(user.id);

        // Se cache é de outro usuário, limpa role enquanto recarrega
        if (cached && cached.userId !== user.id) {
          setRole(null);
          setLoading(true);
        }

        let resolvedRole: UserRole = 'usuario';

        const { data: isAdminRes } = await supabase.rpc('is_admin', { _user_id: user.id });
        if (isAdminRes === true) {
          resolvedRole = 'admin';
        } else {
          const { data: isGestorRes } = await supabase.rpc('is_gestor', { _user_id: user.id });
          if (isGestorRes === true) resolvedRole = 'gestor';
        }

        setRole(resolvedRole);
        localStorage.setItem(
          ROLE_CACHE_KEY,
          JSON.stringify({ userId: user.id, role: resolvedRole } as RoleCache)
        );
      } catch (error) {
        console.error('Erro ao carregar role:', error);
        if (!cached) setRole('usuario');
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = role === 'admin';
  const isGestor = role === 'gestor';
  const isUsuario = role === 'usuario';

  return {
    role,
    loading,
    userId,
    isAdmin,
    isGestor,
    isUsuario,
  };
}
