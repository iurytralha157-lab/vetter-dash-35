import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsResponse } from "@/types/meta";

export interface KPIData {
  activeClientsMeta: number;
  activeClientsGoogle: number;
  totalSpend: number;
  leads: number;
  avgCTR: number;
  avgCPL: number;
  totalImpressions: number;
  totalClicks: number;
  activeCampaigns: number;
}

export interface ChartDataPoint {
  date: string;
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

interface AccountMetaResult {
  accountId: string;
  accountName: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  activeCampaigns: number;
}

const daysFromPeriod = (period: string) => {
  if (period === "30d") return 30;
  if (period === "15d") return 15;
  if (period === "7d") return 7;
  return 1;
};

const periodToMetaParam = (period: string): string => {
  if (period === "30d") return "last_30d";
  if (period === "15d") return "last_14d";
  if (period === "7d") return "last_7d";
  return "yesterday";
};

const dateToISO = (d: Date) => d.toISOString().slice(0, 10);

const getDateRange = (period: string) => {
  const days = daysFromPeriod(period);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { startISO: dateToISO(start), endISO: dateToISO(end) };
};

/**
 * Fetches Meta data for all active accounts via the existing edge function
 * (same data source as individual account pages)
 */
const fetchAllAccountsData = async (
  period: string
): Promise<AccountMetaResult[]> => {
  // Get all active accounts with Meta Ads
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, nome_cliente, meta_account_id, status")
    .eq("usa_meta_ads", true)
    .eq("status", "Ativo")
    .not("meta_account_id", "is", null);

  if (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }

  if (!accounts || accounts.length === 0) return [];

  const metaPeriod = periodToMetaParam(period);

  // Fetch data from all accounts in parallel using the same edge function
  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "fetch-meta-campaigns",
          {
            body: {
              meta_account_id: account.meta_account_id,
              period: metaPeriod,
            },
          }
        );

        if (fnError || !data?.success || !data?.account_metrics) return null;

        const metrics = data.account_metrics;
        const activeCampaigns = (data.campaigns || []).filter(
          (c: any) => c.status === "ACTIVE"
        ).length;

        return {
          accountId: account.id,
          accountName: account.nome_cliente,
          spend: metrics.total_spend ?? 0,
          leads: metrics.total_conversions ?? 0,
          impressions: metrics.total_impressions ?? 0,
          clicks: metrics.total_clicks ?? 0,
          activeCampaigns,
        } as AccountMetaResult;
      } catch {
        return null;
      }
    })
  );

  return results.filter((r): r is AccountMetaResult => r !== null);
};

export const dashboardService = {
  async getKPIData(period: string): Promise<KPIData> {
    // Counts from DB (fast)
    const [metaCount, googleCount, metaResults] = await Promise.all([
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("status", "Ativo")
        .eq("usa_meta_ads", true)
        .not("meta_account_id", "is", null),
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("status", "Ativo")
        .eq("usa_google_ads", true),
      fetchAllAccountsData(period),
    ]);

    if (metaCount.error) throw metaCount.error;
    if (googleCount.error) throw googleCount.error;

    const totalSpend = metaResults.reduce((s, r) => s + r.spend, 0);
    const totalLeads = metaResults.reduce((s, r) => s + r.leads, 0);
    const totalImpressions = metaResults.reduce(
      (s, r) => s + r.impressions,
      0
    );
    const totalClicks = metaResults.reduce((s, r) => s + r.clicks, 0);
    const activeCampaigns = metaResults.reduce(
      (s, r) => s + r.activeCampaigns,
      0
    );

    const avgCTR =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

    return {
      activeClientsMeta: metaCount.count ?? 0,
      activeClientsGoogle: googleCount.count ?? 0,
      totalSpend,
      leads: totalLeads,
      avgCTR,
      avgCPL,
      totalImpressions,
      totalClicks,
      activeCampaigns,
    };
  },

  async getChartData(period: string): Promise<ChartDataPoint[]> {
    // Try campaign_history first (if populated)
    const { startISO, endISO } = getDateRange(period);
    const { data: historyRows, error } = await supabase
      .from("campaign_history")
      .select("date, spend, leads")
      .gte("date", startISO)
      .lte("date", endISO);

    if (error) throw error;

    const map = new Map<string, { spend: number; leads: number }>();

    for (const r of historyRows ?? []) {
      const day = String(r.date);
      const current = map.get(day) ?? { spend: 0, leads: 0 };
      current.spend += Number(r.spend ?? 0);
      current.leads += Number(r.leads ?? 0);
      map.set(day, current);
    }

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
    const { data, error } = await supabase
      .from("campaign_creatives")
      .select(
        "id, creative_name, ad_name, campaign_name, avg_ctr, avg_hook_rate, total_leads"
      )
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

    const [sends, reports, leads] = await Promise.all([
      supabase
        .from("relatorio_disparos")
        .select("id", { count: "exact", head: true })
        .gte("data_disparo", startISO)
        .lte("data_disparo", endISO),
      supabase
        .from("relatorio_disparos")
        .select("id", { count: "exact", head: true })
        .eq("status", "sucesso")
        .gte("data_disparo", startISO)
        .lte("data_disparo", endISO),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${startISO}T00:00:00.000Z`)
        .lte("created_at", `${endISO}T23:59:59.999Z`),
    ]);

    if (sends.error) throw sends.error;
    if (reports.error) throw reports.error;
    if (leads.error) throw leads.error;

    return {
      whatsappSends: sends.count ?? 0,
      reportsSent: reports.count ?? 0,
      leadsSynced: leads.count ?? 0,
    };
  },
};
