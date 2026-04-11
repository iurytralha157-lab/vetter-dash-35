import { supabase } from "@/integrations/supabase/client";

export interface FeedbackCampanhaRow {
  id: number;
  created_at: string;
  account_id: string | null;
  data_referencia: string;
  tipo_funil: "lancamento" | "terceiros";
  campanha_nome: string;
  campanha_codigo_curto: string | null;
  quantidade_recebida: number;
  quantidade_descartado: number;
  quantidade_aguardando_retorno: number;
  quantidade_atendimento: number;
  quantidade_passou_corretor: number;
  quantidade_visita: number;
  quantidade_proposta: number;
  quantidade_venda: number;
}

export interface FunnelTotals {
  recebidos: number;
  descartados: number;
  aguardando_retorno: number;
  atendimento: number;
  passou_corretor: number;
  visita: number;
  proposta: number;
  venda: number;
}

// Fetch campaign-level funnel data for a specific account, split by tipo_funil
export async function fetchCampanhaFunnel(accountId: string): Promise<{
  lancamento: FunnelTotals;
  terceiros: FunnelTotals;
  campanhas_lancamento: FeedbackCampanhaRow[];
  campanhas_terceiros: FeedbackCampanhaRow[];
}> {
  const { data, error } = await supabase
    .from("feedback_campanha" as any)
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data || []) as any[];

  const sumTotals = (filtered: any[]): FunnelTotals => ({
    recebidos: filtered.reduce((s, r) => s + (r.quantidade_recebida || 0), 0),
    descartados: filtered.reduce((s, r) => s + (r.quantidade_descartado || 0), 0),
    aguardando_retorno: filtered.reduce((s, r) => s + (r.quantidade_aguardando_retorno || 0), 0),
    atendimento: filtered.reduce((s, r) => s + (r.quantidade_atendimento || 0), 0),
    passou_corretor: filtered.reduce((s, r) => s + (r.quantidade_passou_corretor || 0), 0),
    visita: filtered.reduce((s, r) => s + (r.quantidade_visita || 0), 0),
    proposta: filtered.reduce((s, r) => s + (r.quantidade_proposta || 0), 0),
    venda: filtered.reduce((s, r) => s + (r.quantidade_venda || 0), 0),
  });

  const lancRows = rows.filter((r: any) => r.tipo_funil === "lancamento");
  const tercRows = rows.filter((r: any) => r.tipo_funil === "terceiros");

  return {
    lancamento: sumTotals(lancRows),
    terceiros: sumTotals(tercRows),
    campanhas_lancamento: lancRows as FeedbackCampanhaRow[],
    campanhas_terceiros: tercRows as FeedbackCampanhaRow[],
  };
}
