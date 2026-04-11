import { supabase } from "@/integrations/supabase/client";

export interface FeedbackFunnelFilters {
  account_id?: string;
  cliente_id?: string;
  id_grupo?: string;
  etapa_funil?: string;
  status_lead?: string;
  temperatura_lead?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchFeedbackFunnel(filters: FeedbackFunnelFilters = {}) {
  let query = supabase
    .from("feedback_funnel" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.account_id) query = query.eq("account_id", filters.account_id);
  if (filters.cliente_id) query = query.eq("cliente_id", filters.cliente_id);
  if (filters.id_grupo) query = query.eq("id_grupo", filters.id_grupo);
  if (filters.etapa_funil) query = query.eq("etapa_funil", filters.etapa_funil);
  if (filters.status_lead) query = query.eq("status_lead", filters.status_lead);
  if (filters.temperatura_lead) query = query.eq("temperatura_lead", filters.temperatura_lead);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as any[];
}

export async function fetchFeedbackFunnelStats() {
  const { data, error } = await supabase
    .from("feedback_funnel" as any)
    .select("etapa_funil, temperatura_lead, duplicado")
    .eq("duplicado", false);

  if (error) throw error;
  const rows = (data || []) as any[];

  return {
    total: rows.length,
    quentes: rows.filter((r) => r.temperatura_lead === "quente").length,
    visitas: rows.filter((r) => ["visita_agendada", "visita_realizada"].includes(r.etapa_funil)).length,
    propostas: rows.filter((r) => r.etapa_funil === "proposta").length,
    vendas: rows.filter((r) => r.etapa_funil === "venda").length,
    perdidos: rows.filter((r) => r.etapa_funil === "perdido").length,
  };
}
