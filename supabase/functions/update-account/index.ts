import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const nullableString = z.union([z.string(), z.null()]).optional();
const nullableNumber = z.union([z.number(), z.null()]).optional();

const UpdatesSchema = z.object({
  nome_cliente: z.string().min(2).optional(),
  telefone: z.string().optional(),
  email: nullableString,
  link_drive: nullableString,
  id_grupo: nullableString,
  canais: z.array(z.string()).optional(),
  status: z.enum(["Ativo", "Pausado", "Arquivado"]).optional(),
  observacoes: nullableString,
  canal_relatorio: nullableString,
  horario_relatorio: nullableString,
  notificacao_saldo_baixo: z.boolean().optional(),
  notificacao_erro_sync: z.boolean().optional(),
  usa_meta_ads: z.boolean().optional(),
  meta_account_id: nullableString,
  meta_business_id: nullableString,
  meta_page_id: nullableString,
  modo_saldo_meta: nullableString,
  saldo_meta: nullableNumber,
  alerta_saldo_baixo: nullableNumber,
  budget_mensal_meta: nullableNumber,
  usa_google_ads: z.boolean().optional(),
  google_ads_id: nullableString,
  budget_mensal_google: nullableNumber,
  usuarios_vinculados: z.array(z.string().uuid()).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Nenhum campo informado para atualização",
});

const BodySchema = z.object({
  accountId: z.string().uuid(),
  updates: UpdatesSchema,
});

const sanitizeNullableString = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeString = (value?: string) => {
  if (value === undefined) return undefined;
  return value.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(JSON.stringify({ error: "Supabase secrets are not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: parsedBody.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accountId, updates } = parsedBody.data;

    const [{ data: rolesData, error: rolesError }, { data: account, error: accountError }] = await Promise.all([
      supabaseService.from("user_roles").select("role").eq("user_id", user.id),
      supabaseService.from("accounts").select("id, gestor_id, user_id").eq("id", accountId).maybeSingle(),
    ]);

    if (rolesError) {
      throw rolesError;
    }

    if (accountError) {
      throw accountError;
    }

    if (!account) {
      return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = (rolesData || []).map((row) => row.role);
    const isAdmin = roles.includes("admin");
    const isAssignedGestor = roles.includes("gestor") && account.gestor_id === user.id;
    const isOwner = account.user_id === user.id;

    if (!isAdmin && !isAssignedGestor && !isOwner) {
      return new Response(JSON.stringify({ error: "Você não tem permissão para atualizar esta conta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.nome_cliente !== undefined) payload.nome_cliente = sanitizeString(updates.nome_cliente);
    if (updates.telefone !== undefined) payload.telefone = sanitizeString(updates.telefone) ?? "";
    if (updates.email !== undefined) payload.email = sanitizeNullableString(updates.email);
    if (updates.link_drive !== undefined) payload.link_drive = sanitizeNullableString(updates.link_drive);
    if (updates.id_grupo !== undefined) payload.id_grupo = sanitizeNullableString(updates.id_grupo);
    if (updates.canais !== undefined) payload.canais = updates.canais;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.observacoes !== undefined) payload.observacoes = sanitizeNullableString(updates.observacoes);
    if (updates.canal_relatorio !== undefined) payload.canal_relatorio = sanitizeNullableString(updates.canal_relatorio);
    if (updates.horario_relatorio !== undefined) payload.horario_relatorio = sanitizeNullableString(updates.horario_relatorio);
    if (updates.notificacao_saldo_baixo !== undefined) payload.notificacao_saldo_baixo = updates.notificacao_saldo_baixo;
    if (updates.notificacao_erro_sync !== undefined) payload.notificacao_erro_sync = updates.notificacao_erro_sync;
    if (updates.usa_meta_ads !== undefined) payload.usa_meta_ads = updates.usa_meta_ads;
    if (updates.meta_account_id !== undefined) payload.meta_account_id = sanitizeNullableString(updates.meta_account_id);
    if (updates.meta_business_id !== undefined) payload.meta_business_id = sanitizeNullableString(updates.meta_business_id);
    if (updates.meta_page_id !== undefined) payload.meta_page_id = sanitizeNullableString(updates.meta_page_id);
    if (updates.modo_saldo_meta !== undefined) payload.modo_saldo_meta = sanitizeNullableString(updates.modo_saldo_meta);
    if (updates.saldo_meta !== undefined) payload.saldo_meta = updates.saldo_meta;
    if (updates.alerta_saldo_baixo !== undefined) payload.alerta_saldo_baixo = updates.alerta_saldo_baixo;
    if (updates.budget_mensal_meta !== undefined) payload.budget_mensal_meta = updates.budget_mensal_meta;
    if (updates.usa_google_ads !== undefined) payload.usa_google_ads = updates.usa_google_ads;
    if (updates.google_ads_id !== undefined) payload.google_ads_id = sanitizeNullableString(updates.google_ads_id);
    if (updates.budget_mensal_google !== undefined) payload.budget_mensal_google = updates.budget_mensal_google;
    if (updates.usuarios_vinculados !== undefined) payload.usuarios_vinculados = updates.usuarios_vinculados;

    const { data: updatedAccount, error: updateError } = await supabaseService
      .from("accounts")
      .update(payload)
      .eq("id", accountId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ account: updatedAccount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("update-account error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
