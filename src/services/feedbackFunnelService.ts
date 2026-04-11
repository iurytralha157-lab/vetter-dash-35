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

// Fetch rows with account name via separate lookup
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

export async function fetchFeedbackFunnelStats(accountId?: string) {
  let query = supabase
    .from("feedback_funnel" as any)
    .select("etapa_funil, temperatura_lead, duplicado")
    .eq("duplicado", false);

  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
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

// Funnel counts by etapa for a specific account
export async function fetchFunnelByAccount(accountId: string) {
  const { data, error } = await supabase
    .from("feedback_funnel" as any)
    .select("etapa_funil")
    .eq("account_id", accountId)
    .eq("duplicado", false);

  if (error) throw error;
  const rows = (data || []) as any[];

  const count = (etapa: string) => rows.filter((r) => r.etapa_funil === etapa).length;

  return {
    lead_novo: count("lead_novo"),
    contato_iniciado: count("contato_iniciado"),
    sem_resposta: count("sem_resposta"),
    atendimento: count("atendimento"),
    visita_agendada: count("visita_agendada"),
    visita_realizada: count("visita_realizada"),
    proposta: count("proposta"),
    venda: count("venda"),
    perdido: count("perdido"),
    total: rows.length,
  };
}

// Funnel counts split by tipo (lançamento vs terceiros) based on campanha_nome
export async function fetchFunnelByAccountSplit(accountId: string) {
  const { data, error } = await supabase
    .from("feedback_funnel" as any)
    .select("etapa_funil, campanha_nome")
    .eq("account_id", accountId)
    .eq("duplicado", false);

  if (error) throw error;
  const rows = (data || []) as any[];

  const classify = (campanha: string | null): "lancamento" | "terceiros" | "outro" => {
    if (!campanha) return "outro";
    const lower = campanha.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes("lancamento") || lower.includes("lançamento")) return "lancamento";
    if (lower.includes("terceiro") || lower.includes("terceiros")) return "terceiros";
    return "outro";
  };

  const buildCounts = (filtered: any[]) => {
    const count = (etapa: string) => filtered.filter((r) => r.etapa_funil === etapa).length;
    return {
      lead_novo: count("lead_novo"),
      contato_iniciado: count("contato_iniciado"),
      sem_resposta: count("sem_resposta"),
      atendimento: count("atendimento"),
      visita_agendada: count("visita_agendada"),
      visita_realizada: count("visita_realizada"),
      proposta: count("proposta"),
      venda: count("venda"),
      perdido: count("perdido"),
      total: filtered.length,
    };
  };

  const lancRows = rows.filter((r: any) => classify(r.campanha_nome) === "lancamento");
  const tercRows = rows.filter((r: any) => classify(r.campanha_nome) === "terceiros");
  const outroRows = rows.filter((r: any) => classify(r.campanha_nome) === "outro");

  return {
    lancamento: buildCounts(lancRows),
    terceiros: buildCounts(tercRows),
    outro: buildCounts(outroRows),
    all: buildCounts(rows),
  };
}

// Fetch accounts map for name resolution
export async function fetchAccountsMap(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("accounts")
    .select("id, nome_cliente")
    .order("nome_cliente");
  
  const map: Record<string, string> = {};
  (data || []).forEach((a: any) => { map[a.id] = a.nome_cliente; });
  return map;
}
