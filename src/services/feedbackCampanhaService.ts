import { supabase } from "@/integrations/supabase/client";

export interface FeedbackCampanhaRow {
  id: number;
  created_at: string;
  account_id: string | null;
  data_referencia: string;
  tipo_funil: "lancamento" | "terceiros";
  campanha_nome: string;
  campanha_codigo_curto: string | null;
  quantidade_recebida: number | null;
  quantidade_descartado: number | null;
  quantidade_aguardando_retorno: number | null;
  quantidade_atendimento: number | null;
  quantidade_passou_corretor: number | null;
  quantidade_visita: number | null;
  quantidade_proposta: number | null;
  quantidade_venda: number | null;
}

export interface FunnelTotals {
  recebidos: number | null;
  descartados: number | null;
  aguardando_retorno: number | null;
  atendimento: number | null;
  passou_corretor: number | null;
  visita: number | null;
  proposta: number | null;
  venda: number | null;
}

// Sum only non-null values; if ALL values are null, return null
function sumNullable(values: (number | null)[]): number | null {
  const nonNull = values.filter((v): v is number => v !== null && v !== undefined);
  if (nonNull.length === 0) return null;
  return nonNull.reduce((a, b) => a + b, 0);
}

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
    recebidos: sumNullable(filtered.map(r => r.quantidade_recebida)),
    descartados: sumNullable(filtered.map(r => r.quantidade_descartado)),
    aguardando_retorno: sumNullable(filtered.map(r => r.quantidade_aguardando_retorno)),
    atendimento: sumNullable(filtered.map(r => r.quantidade_atendimento)),
    passou_corretor: sumNullable(filtered.map(r => r.quantidade_passou_corretor)),
    visita: sumNullable(filtered.map(r => r.quantidade_visita)),
    proposta: sumNullable(filtered.map(r => r.quantidade_proposta)),
    venda: sumNullable(filtered.map(r => r.quantidade_venda)),
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
