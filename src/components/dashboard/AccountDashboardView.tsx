import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MetaMetricsGrid } from "@/components/meta/MetaMetricsGrid";
import { MetaStatusBadge } from "@/components/meta/MetaStatusBadge";
import { MetaCampaignDetailDialog } from "@/components/meta/MetaCampaignDetailDialog";
import { metaAdsService } from "@/services/metaAdsService";
import { fetchCampanhaFunnel, type FunnelTotals } from "@/services/feedbackCampanhaService";
import { SalesFunnelCard } from "@/components/dashboard/SalesFunnelCard";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsResponse, MetaCampaign, MetaAccountMetrics } from "@/types/meta";
import type { MetaPeriod } from "@/components/meta/MetaPeriodFilter";
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

// Map dashboard period to Meta period
const mapPeriod = (p: string): MetaPeriod => {
  if (p === "7d") return "last_7d";
  if (p === "15d") return "last_15d";
  if (p === "30d") return "this_month";
  if (p === "today") return "today";
  return "last_7d";
};

interface AccountDashboardViewProps {
  accountId: string;
  period: string;
}

export function AccountDashboardView({ accountId, period }: AccountDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetaAccountMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [metaAccountId, setMetaAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);
  const [funnelData, setFunnelData] = useState<{
    lancamento: FunnelTotals;
    terceiros: FunnelTotals;
  } | null>(null);

  const metaPeriod = mapPeriod(period);

  useEffect(() => {
    const loadAccount = async () => {
      const { data } = await supabase
        .from("accounts")
        .select("meta_account_id, nome_cliente")
        .eq("id", accountId)
        .single();
      if (data) {
        setMetaAccountId(data.meta_account_id);
        setAccountName(data.nome_cliente);
      }
    };
    loadAccount();
  }, [accountId]);

  const fetchMeta = async (forceRefresh = false) => {
    if (!metaAccountId) return;
    setLoading(true);
    if (forceRefresh) {
      setRefreshing(true);
      metaAdsService.clearCache(`${metaAccountId}_${metaPeriod}`);
    }
    try {
      const data = await metaAdsService.fetchMetaCampaigns(metaAccountId, metaPeriod);
      if (data?.success) {
        setMetrics(data.account_metrics || null);
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      }
    } catch (error) {
      console.error("Erro ao buscar Meta Ads:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (metaAccountId) fetchMeta();
  }, [metaAccountId, metaPeriod]);

  // Fetch funnel data from feedback_campanha (campaign-level)
  useEffect(() => {
    const loadFunnel = async () => {
      try {
        const data = await fetchCampanhaFunnel(accountId);
        setFunnelData({ lancamento: data.lancamento, terceiros: data.terceiros });
      } catch (err) {
        console.error("Error loading funnel data:", err);
        setFunnelData(null);
      }
    };
    loadFunnel();
  }, [accountId]);

  const orderedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const aActive = a.status === "ACTIVE" ? 0 : 1;
      const bActive = b.status === "ACTIVE" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (b.insights?.conversions || 0) - (a.insights?.conversions || 0);
    });
  }, [campaigns]);

  const performanceData = useMemo(() => {
    if (!campaigns.length) return [];
    return campaigns.slice(0, 7).map((camp, idx) => ({
      date: `Dia ${idx + 1}`,
      impressions: camp.insights?.impressions || 0,
      clicks: camp.insights?.clicks || 0,
      conversions: camp.insights?.conversions || 0,
    }));
  }, [campaigns]);

  // Classify Meta campaigns by funnel type based on campaign name
  const metaLeadsByFunnel = useMemo(() => {
    let lancLeads = 0;
    let tercLeads = 0;
    for (const camp of campaigns) {
      const name = (camp.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const leads = camp.insights?.conversions || 0;
      if (name.includes("lancamento") || name.includes("lançamento")) {
        lancLeads += leads;
      } else if (name.includes("terceiro") || name.includes("terceiros")) {
        tercLeads += leads;
      }
      // Campaigns that don't match either keyword are not counted in funnels
    }
    return { lancamento: lancLeads, terceiros: tercLeads };
  }, [campaigns]);

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
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMeta(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <Card>
        <CardContent className="p-6">
          <MetaMetricsGrid metrics={metrics} loading={loading} />
        </CardContent>
      </Card>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8"><Skeleton className="h-80" /></div>
          <div className="col-span-4"><Skeleton className="h-80" /></div>
        </div>
      ) : !metrics ? (
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
                  Desempenho no Período
                </CardTitle>
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

            {/* Sales Funnels - Side by Side */}
            <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-4">
              <SalesFunnelCard
                title="Funil de Lançamento"
                subtitle="Dados do tipo #feedback lançamento"
                totalLeads={lancamentoFunnel.totalLeads}
                leadsRecebidos={lancamentoFunnel.leadsRecebidos}
                steps={lancamentoFunnel.steps}
              />
              <SalesFunnelCard
                title="Funil de Terceiros"
                subtitle="Dados do tipo #feedback terceiros"
                totalLeads={terceirosFunnel.totalLeads}
                leadsRecebidos={terceirosFunnel.leadsRecebidos}
                steps={terceirosFunnel.steps}
              />
            </div>
          </div>

          {/* Campaign Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Detalhada por Campanha</CardTitle>
              <CardDescription>
                {campaigns.length} campanhas no total • Ordenado por conversões
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">Campanha</th>
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

      {/* Campaign Detail Dialog */}
      <MetaCampaignDetailDialog
        campaign={selectedCampaign}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
