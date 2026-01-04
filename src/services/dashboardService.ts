import { supabase } from "@/integrations/supabase/client";

export interface KPIData {
  activeClientsMeta: number;
  activeClientsGoogle: number;
  totalSpend: number;
  leads: number;
  avgCTR: number;
  avgCPL: number;
}

export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  leads: number;
  spend: number;
}

export interface CreativePerformance {
  id: string;
  name: string;
  ctr: number;
  hookRate: number;
}

export interface AutomationStats {
  whatsappSends: number;
  reportsSent: number;
  leadsSynced: number;
}

const daysFromPeriod = (period: string) => {
  if (period === "30d") return 30;
  if (period === "15d") return 15;
  if (period === "7d") return 7;
  return 1;
};

const dateToISO = (d: Date) => d.toISOString().slice(0, 10);

const getDateRange = (period: string) => {
  const days = daysFromPeriod(period);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { startISO: dateToISO(start), endISO: dateToISO(end) };
};

export const dashboardService = {
  async getKPIData(period: string): Promise<KPIData> {
    const { startISO, endISO } = getDateRange(period);

    // 1) Clientes ativos Meta
    const { count: activeClientsMeta, error: metaCountError } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "Ativo")
      .eq("usa_meta_ads", true)
      .eq("ativar_campanhas_meta", true)
      .not("meta_account_id", "is", null);

    if (metaCountError) throw metaCountError;

    // 2) Clientes ativos Google (por flags, pois não vi insights Google no schema enviado)
    const { count: activeClientsGoogle, error: googleCountError } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "Ativo")
      .eq("usa_google_ads", true);

    if (googleCountError) throw googleCountError;

    // 3) Métricas do período (Meta) via campaign_history (tem date, spend, clicks, impressions, leads)
    const { data: historyRows, error: historyError } = await supabase
      .from("campaign_history")
      .select("spend, leads, clicks, impressions, date")
      .gte("date", startISO)
      .lte("date", endISO);

    if (historyError) throw historyError;

    const totals = (historyRows ?? []).reduce(
      (acc, r) => {
        acc.spend += Number(r.spend ?? 0);
        acc.leads += Number(r.leads ?? 0);
        acc.clicks += Number(r.clicks ?? 0);
        acc.impressions += Number(r.impressions ?? 0);
        return acc;
      },
      { spend: 0, leads: 0, clicks: 0, impressions: 0 }
    );

    const avgCTR =
      totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;

    return {
      activeClientsMeta: activeClientsMeta ?? 0,
      activeClientsGoogle: activeClientsGoogle ?? 0,
      totalSpend: totals.spend,
      leads: totals.leads,
      avgCTR,
      avgCPL,
    };
  },

  async getChartData(period: string): Promise<ChartDataPoint[]> {
    const { startISO, endISO } = getDateRange(period);

    const { data: historyRows, error } = await supabase
      .from("campaign_history")
      .select("date, spend, leads")
      .gte("date", startISO)
      .lte("date", endISO);

    if (error) throw error;

    // Agrega por dia (YYYY-MM-DD)
    const map = new Map<string, { spend: number; leads: number }>();

    for (const r of historyRows ?? []) {
      const day = String(r.date); // já é date (YYYY-MM-DD)
      const current = map.get(day) ?? { spend: 0, leads: 0 };
      current.spend += Number(r.spend ?? 0);
      current.leads += Number(r.leads ?? 0);
      map.set(day, current);
    }

    // Garante que todos os dias existam (sem buraco no gráfico)
    const days = daysFromPeriod(period);
    const end = new Date();
    const result: ChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = dateToISO(d);
      const v = map.get(key) ?? { spend: 0, leads: 0 };
      result.push({ date: key, leads: v.leads, spend: v.spend });
    }

    return result;
  },

  async getTopCreatives(): Promise<CreativePerformance[]> {
    // Puxa top 3 criativos pelo volume de leads (ajuste se quiser por CTR/CPL)
    const { data, error } = await supabase
      .from("campaign_creatives")
      .select("id, creative_name, ad_name, campaign_name, avg_ctr, avg_hook_rate, total_leads")
      .order("total_leads", { ascending: false })
      .limit(3);

    if (error) throw error;

    return (data ?? []).map((c) => ({
      id: c.id,
      name: c.creative_name || c.ad_name || c.campaign_name || "Criativo",
      ctr: Number(c.avg_ctr ?? 0),
      hookRate: Number(c.avg_hook_rate ?? 0),
    }));
  },

  async getAutomationStats(period: string): Promise<AutomationStats> {
    const { startISO, endISO } = getDateRange(period);

    // "Envios WhatsApp" (proxy): quantidade de disparos de relatório no período
    const { count: whatsappSends, error: sendsError } = await supabase
      .from("relatorio_disparos")
      .select("id", { count: "exact", head: true })
      .gte("data_disparo", startISO)
      .lte("data_disparo", endISO);

    if (sendsError) throw sendsError;

    // Relatórios enviados com sucesso
    const { count: reportsSent, error: reportsError } = await supabase
      .from("relatorio_disparos")
      .select("id", { count: "exact", head: true })
      .eq("status", "sucesso")
      .gte("data_disparo", startISO)
      .lte("data_disparo", endISO);

    if (reportsError) throw reportsError;

    // Leads sincronizados (assumindo que tabela leads é “leads reais” captados)
    const { count: leadsSynced, error: leadsError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${startISO}T00:00:00.000Z`)
      .lte("created_at", `${endISO}T23:59:59.999Z`);

    if (leadsError) throw leadsError;

    return {
      whatsappSends: whatsappSends ?? 0,
      reportsSent: reportsSent ?? 0,
      leadsSynced: leadsSynced ?? 0,
    };
  },
};
