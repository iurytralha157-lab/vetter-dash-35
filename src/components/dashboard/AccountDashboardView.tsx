import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MetaMetricsGrid } from "@/components/meta/MetaMetricsGrid";
import { MetaStatusBadge } from "@/components/meta/MetaStatusBadge";
import { MetaCampaignDetailDialog } from "@/components/meta/MetaCampaignDetailDialog";
import { metaAdsService } from "@/services/metaAdsService";
import { fetchFunnelByAccountSplit } from "@/services/feedbackFunnelService";
import { SalesFunnelCard } from "@/components/dashboard/SalesFunnelCard";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsResponse, MetaCampaign, MetaAccountMetrics } from "@/types/meta";
import type { MetaPeriod } from "@/components/meta/MetaPeriodFilter";
import {
  Activity, Target, Eye, AlertCircle, Filter, RefreshCw,
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
  const [funnelSplit, setFunnelSplit] = useState<{
    lancamento: { lead_novo: number; contato_iniciado: number; sem_resposta: number; atendimento: number; visita_agendada: number; visita_realizada: number; proposta: number; venda: number; perdido: number; total: number };
    terceiros: { lead_novo: number; contato_iniciado: number; sem_resposta: number; atendimento: number; visita_agendada: number; visita_realizada: number; proposta: number; venda: number; perdido: number; total: number };
    all: { lead_novo: number; contato_iniciado: number; sem_resposta: number; atendimento: number; visita_agendada: number; visita_realizada: number; proposta: number; venda: number; perdido: number; total: number };
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

  // Fetch funnel data from feedback_funnel (etapa_funil counts)
  useEffect(() => {
    const loadFunnel = async () => {
      try {
        const data = await fetchFunnelByAccountSplit(accountId);
        setFunnelSplit(data);
      } catch (err) {
        console.error("Error loading funnel data:", err);
        setFunnelSplit(null);
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

  const funnelSteps = useMemo(() => {
    const totalLeadsMeta = metrics?.total_conversions || 0;
    const f = funnelData || { lead_novo: 0, contato_iniciado: 0, sem_resposta: 0, atendimento: 0, visita_agendada: 0, visita_realizada: 0, proposta: 0, venda: 0, perdido: 0, total: 0 };
    const leadsRecebidos = f.total; // total from feedback_funnel
    return {
      totalLeads: totalLeadsMeta || leadsRecebidos,
      leadsRecebidos,
      steps: [
        { label: "Descartados", value: f.sem_resposta + f.perdido, color: "#94a3b8" },
        { label: "Em Atendimento", value: f.atendimento + f.contato_iniciado + f.lead_novo, color: "#f59e0b" },
        { label: "Visita", value: f.visita_agendada + f.visita_realizada, color: "#8b5cf6" },
        { label: "Proposta", value: f.proposta, color: "#ec4899" },
        { label: "Venda", value: f.venda, color: "#22c55e" },
      ],
    };
  }, [metrics, funnelData]);

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

            {/* Sales Funnel */}
            <Card className="col-span-12 lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5 text-primary" />
                  Funil de Vendas
                </CardTitle>
                <CardDescription>Últimos 30 dias via #feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Total de Leads */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">Total de Leads</span>
                      <span className="text-lg font-bold">{funnelSteps.totalLeads}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ width: "100%", backgroundColor: "#3b82f6" }}
                      >
                        100%
                      </div>
                    </div>
                  </div>

                  {/* Leads Recebidos */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">Leads Recebidos</span>
                      <span className="text-lg font-bold">{funnelSteps.leadsRecebidos}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{
                          width: funnelSteps.totalLeads > 0 ? `${Math.max((funnelSteps.leadsRecebidos / funnelSteps.totalLeads) * 100, 12)}%` : "12%",
                          backgroundColor: "#06b6d4",
                        }}
                      >
                        {funnelSteps.totalLeads > 0
                          ? `${Math.round((funnelSteps.leadsRecebidos / funnelSteps.totalLeads) * 100)}%`
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* Funnel steps — % always based on leadsRecebidos */}
                  {funnelSteps.steps.map((step, idx) => {
                    const pct = funnelSteps.leadsRecebidos > 0
                      ? Math.round((step.value / funnelSteps.leadsRecebidos) * 100)
                      : 0;
                    const barWidth = funnelSteps.leadsRecebidos > 0
                      ? Math.max((step.value / funnelSteps.leadsRecebidos) * 100, step.value > 0 ? 12 : 6)
                      : 6;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {step.value} {step.label} {step.value > 0 && funnelSteps.leadsRecebidos > 0 ? `(${pct}%)` : ""}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: step.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
