import { useState, useEffect } from "react";
import { Users, DollarSign, Target, TrendingUp, BarChart3, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodSelector, Period } from "@/components/dashboard/PeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import {
  dashboardService,
  KPIData,
  ChartDataPoint,
  CreativePerformance,
  AutomationStats,
} from "@/services/dashboardService";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topCreatives, setTopCreatives] = useState<CreativePerformance[]>([]);
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [kpis, chart, creatives, automation] = await Promise.all([
          dashboardService.getKPIData(period),
          dashboardService.getChartData(period),
          dashboardService.getTopCreatives(),
          dashboardService.getAutomationStats(period),
        ]);

        setKpiData(kpis);
        setChartData(chart);
        setTopCreatives(creatives);
        setAutomationStats(automation);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral do desempenho de suas campanhas</p>
          </div>
          <PeriodSelector value={period} onValueChange={setPeriod} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            kpiData && (
              <>
                <KPICard
                  title="Clientes Ativos (Meta)"
                  value={kpiData.activeClientsMeta}
                  icon={Users}
                  description="Clientes com campanhas Meta ativas"
                />
                <KPICard
                  title="Clientes Ativos (Google)"
                  value={kpiData.activeClientsGoogle}
                  icon={Users}
                  description="Clientes com campanhas Google ativas"
                />
                <KPICard
                  title="Investimento Total"
                  value={formatCurrency(kpiData.totalSpend)}
                  icon={DollarSign}
                  description={`${period === "30d" ? "Este mês" : `Últimos ${period.replace("d", " dias")}`}`}
                />
                <KPICard
                  title="Leads Gerados"
                  value={kpiData.leads.toLocaleString()}
                  icon={Target}
                  description={`${period === "30d" ? "Este mês" : `Últimos ${period.replace("d", " dias")}`}`}
                />
                <KPICard
                  title="CTR Médio"
                  value={`${kpiData.avgCTR.toFixed(2)}%`}
                  icon={TrendingUp}
                  description="Taxa de cliques em todas as campanhas"
                />
                <KPICard
                  title="CPL Médio"
                  value={formatCurrency(kpiData.avgCPL)}
                  icon={BarChart3}
                  description="Custo por lead em todas as campanhas"
                />
              </>
            )
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Chart */}
          <Card className="surface-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Leads ao Longo do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Spend Chart */}
          <Card className="surface-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Investimento Diário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="surface-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Estatísticas de Automação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envios WhatsApp</span>
                    <span className="font-medium">{(automationStats?.whatsappSends ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relatórios Enviados</span>
                    <span className="font-medium">{(automationStats?.reportsSent ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leads Sincronizados</span>
                    <span className="font-medium">{(automationStats?.leadsSynced ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="surface-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle>Criativos com Melhor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  {(topCreatives ?? []).map((creative) => (
                    <div
                      key={creative.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                    >
                      <span className="font-medium">{creative.name}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          CTR: <span className="text-foreground font-medium">{creative.ctr.toFixed(2)}%</span>
                        </span>
                        <span className="text-muted-foreground">
                          Taxa de Gancho:{" "}
                          <span className="text-foreground font-medium">{creative.hookRate.toFixed(1)}%</span>
                        </span>
                      </div>
                    </div>
                  ))}
                  {topCreatives.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Ainda sem dados suficientes de criativos para exibir.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
