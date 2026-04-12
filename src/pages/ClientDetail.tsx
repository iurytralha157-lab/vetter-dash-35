// src/pages/ClientDetail.tsx - VERSÃO COM DASHBOARD COMPLETO 🔥
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { type MetaPeriod } from "@/components/meta/MetaPeriodFilter";
import { UnifiedPeriodFilter } from "@/components/ui/unified-period-filter";
import { MetaMetricsGrid } from "@/components/meta/MetaMetricsGrid";
import { MetaCampaignTable } from "@/components/meta/MetaCampaignTable";
import { MetaCampaignDetailDialog } from "@/components/meta/MetaCampaignDetailDialog";
import { MetaStatusBadge } from "@/components/meta/MetaStatusBadge";
import { ModernAccountForm } from "@/components/forms/ModernAccountForm";
import { buildManagedAccountUpdate, updateAccount } from "@/services/accountsService";
import { metaAdsService } from "@/services/metaAdsService";
import type { MetaAdsResponse, MetaCampaign, MetaAccountMetrics, MetaAccountBalance } from "@/types/meta";
import {
  ArrowLeft, ExternalLink, RefreshCw, FolderOpen, Building2, Mail, Phone,
  User, Check, X, BarChart3, Link2, TrendingUp, AlertCircle, Instagram,
  Globe, Calendar, DollarSign, Target, Activity, Pencil, Eye, MousePointer,
  TrendingDown, Zap, PieChart as PieChartIcon, CreditCard, AlertTriangle, CheckCircle2, ShieldAlert
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const safe = (n: number | null | undefined, fallback = 0) => (typeof n === "number" && !Number.isNaN(n) ? n : fallback);

const currency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value));

const getLeads = (c: MetaCampaign) => {
  const conv = (c as any)?.insights?.conversions;
  return typeof conv === "number" && !Number.isNaN(conv) ? conv : 0;
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [period, setPeriod] = useState<MetaPeriod>("last_7d");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [resp, setResp] = useState<MetaAdsResponse | null>(null);
  const [metrics, setMetrics] = useState<MetaAccountMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [accountBalance, setAccountBalance] = useState<MetaAccountBalance | null>(null);
  const [clientDriveUrl, setClientDriveUrl] = useState<string | null>(null);
  const [metaAccountId, setMetaAccountId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<any>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAccountBasics(accountId: string) {
    const { data, error } = await supabase.from("accounts").select("*").eq("id", accountId).single();

    if (error) {
      console.error("Erro buscando accounts:", error);
      toast({ title: "Erro", description: "Conta não encontrada.", variant: "destructive" });
      return;
    }

    setAccountData(data);
    setMetaAccountId(data?.meta_account_id || null);
    setClientDriveUrl(data?.link_drive || null);
  }

  async function fetchMeta(forceRefresh = false) {
    if (!metaAccountId) return;
    setLoading(true);
    if (forceRefresh) {
      setRefreshing(true);
      metaAdsService.clearCache(`${metaAccountId}_${period}`);
    }
    try {
      const data = await metaAdsService.fetchMetaCampaigns(metaAccountId, period, customRange);
      if (!data?.success) throw new Error(data?.error || "Falha ao buscar Meta Ads");
      setResp(data);
      setMetrics(data.account_metrics || null);
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      setAccountBalance(data.account_balance || null);
      setLastFetchTime(Date.now());
    } catch (error: any) {
      toast({ title: "Erro ao buscar Meta Ads", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (id) loadAccountBasics(id);
  }, [id]);

  useEffect(() => {
    if (metaAccountId) fetchMeta();
  }, [metaAccountId, period, customRange]);

  const orderedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      // Ativas primeiro
      const aActive = a.status === 'ACTIVE' ? 0 : 1;
      const bActive = b.status === 'ACTIVE' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Depois por leads (mais leads primeiro)
      return getLeads(b) - getLeads(a);
    });
  }, [campaigns]);

  const kpis = useMemo(() => {
    if (!metrics) return null;
    const m = metrics;
    return {
      total_spend: safe(m.total_spend),
      total_impressions: safe(m.total_impressions),
      total_clicks: safe(m.total_clicks),
      total_conversions: safe(m.total_conversions),
      avg_ctr: safe(m.avg_ctr),
      avg_cpc: safe(m.avg_cpc),
      avg_cpm: safe(m.avg_cpm),
    };
  }, [metrics]);

  // Dados para gráficos do dashboard
  const performanceData = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    return campaigns.slice(0, 7).map((camp, idx) => ({
      date: `Dia ${idx + 1}`,
      impressions: camp.insights?.impressions || 0,
      clicks: camp.insights?.clicks || 0,
      spend: camp.insights?.spend || 0,
      conversions: camp.insights?.conversions || 0,
    }));
  }, [campaigns]);

  const topCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => (b.insights?.conversions || 0) - (a.insights?.conversions || 0))
      .slice(0, 5);
  }, [campaigns]);

  const budgetDistribution = useMemo(() => {
    const total = campaigns.reduce((sum, c) => sum + (c.insights?.spend || 0), 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return topCampaigns.map((camp, idx) => {
      const spend = camp.insights?.spend || 0;
      return {
        name: camp.name.substring(0, 25) + '...',
        value: total > 0 ? Math.round((spend / total) * 100) : 0,
        spend: spend,
        color: colors[idx] || '#6b7280'
      };
    });
  }, [topCampaigns]);

  const handleCampaignClick = (campaign: MetaCampaign) => {
    setSelectedCampaign(campaign);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-bold">
                    {accountData?.nome_cliente?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">{accountData?.nome_cliente || "Carregando..."}</h1>
                  <p className="text-sm text-muted-foreground">
                    {accountData?.nome_empresa} • {accountData?.status || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {clientDriveUrl && (
              <Button variant="outline" onClick={() => window.open(clientDriveUrl, "_blank")} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Google Drive
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditModalOpen(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <UnifiedPeriodFilter value={period} customRange={customRange} onChange={(v, cr) => { setPeriod(v as MetaPeriod); setCustomRange(cr); }} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchMeta(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Payment issue alert - only shown when there's a problem */}
        {accountBalance && (accountBalance.account_status === 3 || accountBalance.account_status === 9 || accountBalance.disable_reason === 3) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              ⚠️ Problema de pagamento detectado — verificar no Gerenciador de Anúncios
            </p>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <MetaMetricsGrid metrics={metrics} loading={loading} balance={accountBalance} />
          </CardContent>
        </Card>

        {/* TABS */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="detalhes" className="gap-2">
              <User className="h-4 w-4" />
              Detalhes da Conta
            </TabsTrigger>
          </TabsList>

          {/* TAB: DASHBOARD */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {loading ? (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8"><Skeleton className="h-80" /></div>
                <div className="col-span-4"><Skeleton className="h-80" /></div>
              </div>
            ) : !kpis ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Gráficos */}
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
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="impressions" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={3}
                                name="Impressões"
                                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="clicks" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                name="Cliques"
                                dot={{ fill: '#10b981', r: 4 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="conversions" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                name="Conversões"
                                dot={{ fill: '#f59e0b', r: 4 }}
                              />
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

                  {/* Top 5 Campanhas */}
                  <Card className="col-span-12 lg:col-span-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <PieChartIcon className="w-5 h-5 text-primary" />
                        Top 5 Campanhas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {budgetDistribution.length > 0 ? (
                        <>
                          <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <RePieChart>
                                <Pie
                                  data={budgetDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {budgetDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </RePieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="space-y-3 mt-6">
                            {budgetDistribution.map((item, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-sm truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-sm font-semibold">{item.value}%</span>
                                  <span className="text-xs text-muted-foreground">
                                    {currency(item.spend)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                          Sem dados para exibir
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela de Performance por Campanha */}
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
                              const ctr = campaign.insights?.ctr || 0;
                              
                              return (
                                <tr 
                                  key={campaign.id} 
                                  className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => handleCampaignClick(campaign)}
                                >
                                  <td className="py-4 px-4 font-medium max-w-xs truncate">
                                    {campaign.name}
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
                                  <td className="py-4 px-4 text-right">
                                    {currency(spend)}
                                  </td>
                                  <td className="py-4 px-4 text-right text-green-600 dark:text-green-400 font-bold">
                                    {conversions}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    {currency(cpl)}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCampaignClick(campaign);
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
          </TabsContent>



          {/* TAB: DETALHES (Original) */}
          <TabsContent value="detalhes" className="mt-6 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-primary/10 to-purple-500/10 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-primary" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      Cliente
                    </div>
                    <p className="text-lg font-semibold">{accountData?.nome_cliente || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Empresa
                    </div>
                    <p className="text-lg font-semibold">{accountData?.nome_empresa || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="text-base">{accountData?.email || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Telefone
                    </div>
                    <p className="text-base font-medium">{accountData?.telefone || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      Documentos
                    </div>
                    {accountData?.link_drive ? (
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => window.open(accountData.link_drive, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir Drive
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-sm">Não configurado</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      Meta Account ID
                    </div>
                    <p className="text-sm font-mono">{accountData?.meta_account_id || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <MetaCampaignDetailDialog 
          campaign={selectedCampaign}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        {editModalOpen && (
          <ModernAccountForm
            initialData={accountData}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSubmit={async (data) => {
              try {
                await updateAccount(id!, buildManagedAccountUpdate(data));

                toast({
                  title: "Sucesso",
                  description: "Conta atualizada com sucesso!",
                });

                setEditModalOpen(false);
                if (id) loadAccountBasics(id);
              } catch (error: any) {
                console.error("Erro ao atualizar conta:", error);
                toast({
                  title: "Erro",
                  description: error.message || "Não foi possível atualizar a conta",
                  variant: "destructive",
                });
              }
            }}
            isEdit={true}
          />
        )}
      </div>
    </AppLayout>
  );
}