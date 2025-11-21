// Supabase Edge Function: list-users
// Returns a combined list of users with profile, role and client counts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Two clients: one with service role (for admin/list operations) and one with the caller JWT
    const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Identify caller
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role securely in DB
    const { data: roleRow, error: roleErr } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if ((roleErr && roleErr.message) || roleRow?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all auth users (service role required)
    const { data: { users: authUsers }, error: authError } = await supabaseService.auth.admin.listUsers();
    if (authError) throw authError;

    // Load complementary data
    const [profilesRes, rolesRes, accountsRes, clientesRes] = await Promise.all([
      supabaseService.from("profiles").select("*"),
      supabaseService.from("user_roles").select("*"),
      supabaseService.from("accounts").select("gestor_id, cliente_id"),
      supabaseService.from("clientes").select("id"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const accounts = accountsRes.data ?? [];
    const totalClientes = clientesRes.data?.length ?? 0;

    // Count unique clientes per gestor
    const clientCountByGestor: Record<string, Set<string>> = {};
    accounts.forEach((acc: any) => {
      if (acc.gestor_id && acc.cliente_id) {
        if (!clientCountByGestor[acc.gestor_id]) {
          clientCountByGestor[acc.gestor_id] = new Set();
        }
        clientCountByGestor[acc.gestor_id].add(acc.cliente_id);
      }
    });

    const users = (authUsers ?? []).map((au: any) => {
      const profile = profiles.find((p: any) => p.id === au.id);
      const roleRow = roles.find((r: any) => r.user_id === au.id);
      const role = roleRow?.role ?? "usuario";

      let total_clientes = 0;
      if (role === "admin") {
        total_clientes = totalClientes;
      } else if (role === "gestor") {
        total_clientes = clientCountByGestor[au.id]?.size ?? 0;
      }

      return {
        id: au.id,
        email: au.email ?? "",
        name: profile?.name ?? null,
        role,
        ativo: profile?.ativo ?? true,
        ultimo_acesso: profile?.ultimo_acesso ?? null,
        last_sign_in_at: au.last_sign_in_at ?? null,
        created_at: au.created_at,
        telefone: profile?.telefone ?? null,
        departamento: profile?.departamento ?? null,
        updated_at: profile?.updated_at ?? au.updated_at,
        total_clientes,
      };
    });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("list-users error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
