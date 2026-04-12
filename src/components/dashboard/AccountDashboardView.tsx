import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MetaStatusBadge } from "@/components/meta/MetaStatusBadge";
import { MetaCampaignDetailDialog } from "@/components/meta/MetaCampaignDetailDialog";
import { metaAdsService } from "@/services/metaAdsService";
import { fetchCampanhaFunnel, type FunnelTotals } from "@/services/feedbackCampanhaService";
import { SalesFunnelCard } from "@/components/dashboard/SalesFunnelCard";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsResponse, MetaCampaign, MetaAccountMetrics } from "@/types/meta";
import type { MetaPeriod } from "@/components/meta/MetaPeriodFilter";
import {
  AlertCircle, RefreshCw, Eye, DollarSign, Target, TrendingUp, Users, Wallet, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value));

const mapPeriod = (p: string): MetaPeriod => {
  // If already a MetaPeriod value, return as-is
  const validPeriods: MetaPeriod[] = ['today', 'yesterday', 'last_7d', 'last_15d', 'last_30d', 'this_month', 'last_month', 'this_quarter', 'this_year'];
  if (validPeriods.includes(p as MetaPeriod)) return p as MetaPeriod;
  // Legacy mapping
  if (p === "7d") return "last_7d";
  if (p === "15d") return "last_15d";
  if (p === "30d") return "last_30d";
  return "last_7d";
};

interface AccountDashboardViewProps {
  accountId: string;
  period: string;
  customRange?: { from: Date; to: Date };
}

export function AccountDashboardView({ accountId, period, customRange }: AccountDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetaAccountMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [metaAccountId, setMetaAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState<any>(null);
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
      const data = await metaAdsService.fetchMetaCampaigns(metaAccountId, metaPeriod, metaPeriod === 'custom' ? customRange : undefined);
      if (data?.success) {
        setMetrics(data.account_metrics || null);
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
        setAccountBalance(data.account_balance || null);
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
  }, [metaAccountId, metaPeriod, customRange]);

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

  // Classify campaigns by funnel type
  const classifiedCampaigns = useMemo(() => {
    const lanc: MetaCampaign[] = [];
    const terc: MetaCampaign[] = [];
    const other: MetaCampaign[] = [];
    for (const camp of campaigns) {
      const name = (camp.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (name.includes("lancamento") || name.includes("lançamento")) {
        lanc.push(camp);
      } else if (name.includes("terceiro") || name.includes("terceiros")) {
        terc.push(camp);
      } else {
        other.push(camp);
      }
    }
    return { lanc, terc, other };
  }, [campaigns]);

  // Aggregate metrics by funnel type
  const splitMetrics = useMemo(() => {
    const sum = (list: MetaCampaign[]) => {
      let spend = 0, leads = 0;
      for (const c of list) {
        spend += c.insights?.spend || 0;
        leads += c.insights?.conversions || 0;
      }
      return { spend, leads, cpl: leads > 0 ? spend / leads : 0 };
    };
    return {
      lancamento: sum(classifiedCampaigns.lanc),
      terceiros: sum(classifiedCampaigns.terc),
    };
  }, [classifiedCampaigns]);

  // Only active campaigns with spend > 0
  const activeCampaigns = useMemo(() => {
    return campaigns
      .filter(c => c.status === "ACTIVE" && (c.insights?.spend || 0) > 0)
      .sort((a, b) => (b.insights?.conversions || 0) - (a.insights?.conversions || 0));
  }, [campaigns]);

  // Comparison chart data
  const comparisonData = useMemo(() => {
    return [
      {
        name: "Lançamento",
        "Valor Gasto": splitMetrics.lancamento.spend,
        "Leads": splitMetrics.lancamento.leads,
      },
      {
        name: "Terceiros",
        "Valor Gasto": splitMetrics.terceiros.spend,
        "Leads": splitMetrics.terceiros.leads,
      },
    ];
  }, [splitMetrics]);

  // Funnel data
  const lancamentoFunnel = useMemo(() => {
    const f = funnelData?.lancamento;
    const totalFromMeta = splitMetrics.lancamento.leads;
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
  }, [funnelData, splitMetrics]);

  const terceirosFunnel = useMemo(() => {
    const f = funnelData?.terceiros;
    const totalFromMeta = splitMetrics.terceiros.leads;
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
  }, [funnelData, splitMetrics]);

  const totalLeads = (metrics?.total_conversions || 0);
  const totalSpend = (metrics?.total_spend || 0);
  const totalFollowers = (metrics?.total_followers || 0);
  const conversionRate = totalLeads > 0 && (metrics?.total_clicks || 0) > 0
    ? ((totalLeads / (metrics?.total_clicks || 1)) * 100)
    : 0;
  const fundos = accountBalance?.balance ?? 0;

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

      {/* ===== KPIs ===== */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
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
          {/* Row 1: 5 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard
              title="Fundos"
              value={currency(fundos)}
              icon={<Wallet className="h-5 w-5 text-emerald-500" />}
              bgIcon="bg-emerald-500/10"
            />
            <KPICard
              title="Total de Leads"
              value={totalLeads.toString()}
              icon={<Target className="h-5 w-5 text-blue-500" />}
              bgIcon="bg-blue-500/10"
            />
            <KPICard
              title="Seguidores"
              value={formatNumber(totalFollowers)}
              icon={<Users className="h-5 w-5 text-pink-500" />}
              bgIcon="bg-pink-500/10"
            />
            <KPICard
              title="Taxa de Conversão"
              value={`${conversionRate.toFixed(2)}%`}
              icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
              bgIcon="bg-purple-500/10"
            />
            <KPICard
              title="Investimento Total"
              value={currency(totalSpend)}
              icon={<DollarSign className="h-5 w-5 text-orange-500" />}
              bgIcon="bg-orange-500/10"
            />
          </div>

          {/* Row 2: Split Lançamento | Terceiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lançamento */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Lançamento
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <MiniKPI label="Gasto" value={currency(splitMetrics.lancamento.spend)} />
                <MiniKPI label="Leads" value={splitMetrics.lancamento.leads.toString()} />
                <MiniKPI label="CPL" value={currency(splitMetrics.lancamento.cpl)} />
              </CardContent>
            </Card>
            {/* Terceiros */}
            <Card className="border-l-4 border-l-sky-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                  Terceiros
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <MiniKPI label="Gasto" value={currency(splitMetrics.terceiros.spend)} />
                <MiniKPI label="Leads" value={splitMetrics.terceiros.leads.toString()} />
                <MiniKPI label="CPL" value={currency(splitMetrics.terceiros.cpl)} />
              </CardContent>
            </Card>
          </div>

          {/* ===== Comparison Chart + Funnels ===== */}
          <div className="grid grid-cols-12 gap-6">
            {/* Comparison Chart */}
            <Card className="col-span-12 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-lg">Comparativo Lançamento vs Terceiros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "Valor Gasto") return [currency(value), name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="Valor Gasto" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="right" dataKey="Leads" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Funnels */}
            <div className="col-span-12 lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <SalesFunnelCard
                title="Funil Lançamento"
                subtitle="Meta + #feedback lançamento"
                totalLeads={lancamentoFunnel.totalLeads}
                leadsRecebidos={lancamentoFunnel.leadsRecebidos}
                steps={lancamentoFunnel.steps}
              />
              <SalesFunnelCard
                title="Funil Terceiros"
                subtitle="Meta + #feedback terceiros"
                totalLeads={terceirosFunnel.totalLeads}
                leadsRecebidos={terceirosFunnel.leadsRecebidos}
                steps={terceirosFunnel.steps}
              />
            </div>
          </div>

          {/* ===== Campaign Table - Active with spend only ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance por Campanha</CardTitle>
              <CardDescription>
                {activeCampaigns.length} campanhas ativas com investimento no período
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCampaigns.length > 0 ? (
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
                        <th className="text-right py-3 px-4 font-medium text-sm">Seguidores</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">CPL</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCampaigns.map((campaign) => {
                        const spend = campaign.insights?.spend || 0;
                        const conversions = campaign.insights?.conversions || 0;
                        const followers = campaign.insights?.followers || 0;
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
                            <td className="py-4 px-4 text-right text-pink-600 dark:text-pink-400">
                              {followers > 0 ? formatNumber(followers) : '—'}
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
                  <p>Nenhuma campanha ativa com investimento no período</p>
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

// --- Sub-components ---

function KPICard({ title, value, icon, bgIcon }: { title: string; value: string; icon: React.ReactNode; bgIcon: string }) {
  return (
    <Card className="surface-elevated">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${bgIcon}`}>{icon}</div>
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
