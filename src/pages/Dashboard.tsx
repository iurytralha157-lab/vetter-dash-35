import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { UnifiedPeriodFilter, type UnifiedPeriod } from "@/components/ui/unified-period-filter";
import { AccountSelector } from "@/components/dashboard/AccountSelector";
import { AccountDashboardView } from "@/components/dashboard/AccountDashboardView";
import { MetaMetricsGrid } from "@/components/meta/MetaMetricsGrid";
import { MetaStatusBadge } from "@/components/meta/MetaStatusBadge";
import { SalesFunnelCard } from "@/components/dashboard/SalesFunnelCard";
import { MetaCampaignDetailDialog } from "@/components/meta/MetaCampaignDetailDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { metaAdsService } from "@/services/metaAdsService";
import { fetchCampanhaFunnel, type FunnelTotals } from "@/services/feedbackCampanhaService";
import { supabase } from "@/integrations/supabase/client";
import type { MetaCampaign, MetaAccountMetrics } from "@/types/meta";
import { type MetaPeriod } from "@/components/meta/MetaPeriodFilter";
import {
  Activity, Target, Eye, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatNumber = (value: number) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return Math.round(value).toString();
};

export default function Dashboard() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [period, setPeriod] = useState<UnifiedPeriod>("last_7d");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Compact header: Title + Account + Period on one line */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <AccountSelector value={selectedAccount} onValueChange={setSelectedAccount} />
          </div>
          <div className="flex items-center gap-2">
            <UnifiedPeriodFilter value={period} onChange={(v) => setPeriod(v)} />
          </div>

        </div>

        {selectedAccount ? (
          <AccountDashboardView accountId={selectedAccount} period={period} />
        ) : (
          <GlobalDashboardView period={period} />
        )}
      </div>
    </AppLayout>
  );
}

/* ── Global aggregated view ── */

function GlobalDashboardView({ period }: { period: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<MetaAccountMetrics | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<MetaCampaign[]>([]);
  const [funnelData, setFunnelData] = useState<{
    lancamento: FunnelTotals;
    terceiros: FunnelTotals;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);

  const metaPeriod = period as MetaPeriod;

  const fetchAll = async (forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) setRefreshing(true);

    try {
      // 1. Get all active accounts with Meta
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, meta_account_id, nome_cliente")
        .eq("status", "Ativo")
        .eq("usa_meta_ads", true)
        .not("meta_account_id", "is", null);

      if (!accounts || accounts.length === 0) {
        setAggregatedMetrics(null);
        setAllCampaigns([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch Meta data for each account in parallel
      const results = await Promise.all(
        accounts.map(async (acc) => {
          try {
            if (forceRefresh) {
              metaAdsService.clearCache(`${acc.meta_account_id}_${metaPeriod}`);
            }
            const data = await metaAdsService.fetchMetaCampaigns(acc.meta_account_id!, metaPeriod);
            if (data?.success) {
              return {
                accountId: acc.id,
                accountName: acc.nome_cliente,
                metrics: data.account_metrics || null,
                campaigns: (Array.isArray(data.campaigns) ? data.campaigns : []).map((c) => ({
                  ...c,
                  _accountName: acc.nome_cliente,
                })),
              };
            }
          } catch {
            // skip failed accounts
          }
          return null;
        })
      );

      const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);

      // 3. Aggregate metrics
      const totals: MetaAccountMetrics = {
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_conversions: 0,
        avg_ctr: 0,
        avg_cpm: 0,
        avg_cpc: 0,
      };

      for (const v of valid) {
        if (v.metrics) {
          totals.total_spend += v.metrics.total_spend || 0;
          totals.total_impressions += v.metrics.total_impressions || 0;
          totals.total_clicks += v.metrics.total_clicks || 0;
          totals.total_conversions += v.metrics.total_conversions || 0;
        }
      }

      totals.avg_ctr = totals.total_impressions > 0
        ? (totals.total_clicks / totals.total_impressions) * 100
        : 0;
      totals.avg_cpm = totals.total_impressions > 0
        ? (totals.total_spend / totals.total_impressions) * 1000
        : 0;
      totals.avg_cpc = totals.total_clicks > 0
        ? totals.total_spend / totals.total_clicks
        : 0;
      setAggregatedMetrics(totals);

      // 4. Merge all campaigns
      const merged = valid.flatMap((v) => v.campaigns);
      setAllCampaigns(merged);

      // 5. Aggregate funnel data from all accounts
      const funnelResults = await Promise.all(
        accounts.map(async (acc) => {
          try {
            return await fetchCampanhaFunnel(acc.id);
          } catch {
            return null;
          }
        })
      );

      const aggFunnel = {
        lancamento: { recebidos: null as number | null, descartados: null as number | null, atendimento: null as number | null, visita: null as number | null, proposta: null as number | null, venda: null as number | null, passou_corretor: null as number | null },
        terceiros: { recebidos: null as number | null, descartados: null as number | null, atendimento: null as number | null, visita: null as number | null, proposta: null as number | null, venda: null as number | null, passou_corretor: null as number | null },
      };

      const sumField = (current: number | null, add: number | null): number | null => {
        if (add === null || add === undefined) return current;
        return (current ?? 0) + add;
      };

      for (const fr of funnelResults) {
        if (!fr) continue;
        for (const key of ["lancamento", "terceiros"] as const) {
          const src = fr[key];
          if (!src) continue;
          const dest = aggFunnel[key];
          dest.recebidos = sumField(dest.recebidos, src.recebidos);
          dest.descartados = sumField(dest.descartados, src.descartados);
          dest.atendimento = sumField(dest.atendimento, src.atendimento);
          dest.visita = sumField(dest.visita, src.visita);
          dest.proposta = sumField(dest.proposta, src.proposta);
          dest.venda = sumField(dest.venda, src.venda);
          dest.passou_corretor = sumField(dest.passou_corretor, src.passou_corretor);
        }
      }

      setFunnelData(aggFunnel as any);
    } catch (err) {
      console.error("Failed to load global dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [metaPeriod]);

  const orderedCampaigns = useMemo(() => {
    return [...allCampaigns].sort((a, b) => {
      const aActive = a.status === "ACTIVE" ? 0 : 1;
      const bActive = b.status === "ACTIVE" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (b.insights?.conversions || 0) - (a.insights?.conversions || 0);
    });
  }, [allCampaigns]);

  const performanceData = useMemo(() => {
    if (!allCampaigns.length) return [];
    return allCampaigns
      .filter((c) => c.status === "ACTIVE")
      .slice(0, 10)
      .map((camp, idx) => ({
        date: `Camp ${idx + 1}`,
        impressions: camp.insights?.impressions || 0,
        clicks: camp.insights?.clicks || 0,
        conversions: camp.insights?.conversions || 0,
      }));
  }, [allCampaigns]);

  // Classify campaigns by funnel type
  const metaLeadsByFunnel = useMemo(() => {
    let lancLeads = 0;
    let tercLeads = 0;
    for (const camp of allCampaigns) {
      const name = (camp.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const leads = camp.insights?.conversions || 0;
      if (name.includes("lancamento") || name.includes("lançamento")) {
        lancLeads += leads;
      } else if (name.includes("terceiro") || name.includes("terceiros")) {
        tercLeads += leads;
      }
    }
    return { lancamento: lancLeads, terceiros: tercLeads };
  }, [allCampaigns]);

  const lancamentoFunnel = useMemo(() => {
    const f = funnelData?.lancamento;
    const totalFromMeta = metaLeadsByFunnel.lancamento;
    const recebidos = f?.recebidos ?? null;
    return {
      totalLeads: totalFromMeta > 0 ? totalFromMeta : recebidos,
      leadsRecebidos: recebidos,
      steps: [
        { label: "Descartados", value: f?.descartados ?? null, color: "#94a3b8" },
        { label: "Em Atendimento", value: f?.atendimento ?? null, color: "#f59e0b" },
        { label: "Visita", value: f?.visita ?? null, color: "#8b5cf6" },
        { label: "Proposta", value: f?.proposta ?? null, color: "#ec4899" },
        { label: "Venda", value: f?.venda ?? null, color: "#22c55e" },
      ],
    };
  }, [funnelData, metaLeadsByFunnel]);

  const terceirosFunnel = useMemo(() => {
    const f = funnelData?.terceiros;
    const totalFromMeta = metaLeadsByFunnel.terceiros;
    const recebidos = f?.recebidos ?? null;
    return {
      totalLeads: totalFromMeta > 0 ? totalFromMeta : recebidos,
      leadsRecebidos: recebidos,
      steps: [
        { label: "Descartados", value: f?.descartados ?? null, color: "#94a3b8" },
        { label: "Atendimento SDR", value: f?.atendimento ?? null, color: "#f59e0b" },
        { label: "Passou para Corretor", value: f?.passou_corretor ?? null, color: "#0ea5e9" },
        { label: "Visita", value: f?.visita ?? null, color: "#8b5cf6" },
        { label: "Proposta", value: f?.proposta ?? null, color: "#ec4899" },
        { label: "Venda", value: f?.venda ?? null, color: "#22c55e" },
      ],
    };
  }, [funnelData, metaLeadsByFunnel]);

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Aggregated KPIs */}
      <Card>
        <CardContent className="p-6">
          <MetaMetricsGrid metrics={aggregatedMetrics} loading={loading} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8"><Skeleton className="h-80" /></div>
          <div className="col-span-4"><Skeleton className="h-80" /></div>
        </div>
      ) : !aggregatedMetrics ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-6">
            {/* Performance Chart */}
            <Card className="col-span-12 lg:col-span-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  Desempenho Consolidado
                </CardTitle>
                <CardDescription>Top campanhas ativas de todas as contas</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={3} name="Impressões" dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                        <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={3} name="Cliques" dot={{ fill: "#10b981", r: 4 }} />
                        <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={3} name="Conversões" dot={{ fill: "#f59e0b", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Funnels */}
            <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-4">
              <SalesFunnelCard
                title="Funil de Lançamento"
                subtitle="Consolidado de todas as contas"
                totalLeads={lancamentoFunnel.totalLeads}
                leadsRecebidos={lancamentoFunnel.leadsRecebidos}
                steps={lancamentoFunnel.steps}
              />
              <SalesFunnelCard
                title="Funil de Terceiros"
                subtitle="Consolidado de todas as contas"
                totalLeads={terceirosFunnel.totalLeads}
                leadsRecebidos={terceirosFunnel.leadsRecebidos}
                steps={terceirosFunnel.steps}
              />
            </div>
          </div>

          {/* Campaign Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Detalhada por Campanha</CardTitle>
              <CardDescription>
                {allCampaigns.length} campanhas de todas as contas • Ordenado por conversões
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allCampaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">Campanha</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Conta</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Impressões</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Cliques</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Gasto</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Leads</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">CPL</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedCampaigns.map((campaign) => {
                        const spend = campaign.insights?.spend || 0;
                        const conversions = campaign.insights?.conversions || 0;
                        const cpl = conversions > 0 ? spend / conversions : 0;

                        return (
                          <tr
                            key={campaign.id}
                            className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setDialogOpen(true);
                            }}
                          >
                            <td className="py-4 px-4 font-medium max-w-xs truncate">{campaign.name}</td>
                            <td className="py-4 px-4 text-sm text-muted-foreground max-w-[150px] truncate">
                              {(campaign as any)._accountName || "—"}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <MetaStatusBadge status={campaign.status} />
                            </td>
                            <td className="py-4 px-4 text-right text-muted-foreground">
                              {formatNumber(campaign.insights?.impressions || 0)}
                            </td>
                            <td className="py-4 px-4 text-right text-primary font-semibold">
                              {formatNumber(campaign.insights?.clicks || 0)}
                            </td>
                            <td className="py-4 px-4 text-right">{currency(spend)}</td>
                            <td className="py-4 px-4 text-right text-green-600 dark:text-green-400 font-bold">
                              {conversions}
                            </td>
                            <td className="py-4 px-4 text-right">{currency(cpl)}</td>
                            <td className="py-4 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaign(campaign);
                                  setDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma campanha encontrada no período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <MetaCampaignDetailDialog
        campaign={selectedCampaign}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
