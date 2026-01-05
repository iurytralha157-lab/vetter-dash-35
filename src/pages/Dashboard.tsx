import { useState, useEffect } from "react";
import { Users, DollarSign, Target, TrendingUp, BarChart3, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { KPICardLarge } from "@/components/dashboard/KPICardLarge";
import { SmartProjectionCard } from "@/components/dashboard/SmartProjectionCard";
import { ProfitCard } from "@/components/dashboard/ProfitCard";
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

  // Prepare mini chart data from chartData
  const miniChartData = chartData.map((d) => ({ value: d.leads }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          breadcrumb="Visão Geral"
          subtitle="Desempenho de campanhas"
          actions={<PeriodSelector value={period} onValueChange={setPeriod} />}
        />

        {/* Main KPI Grid - 12 columns */}
        {isLoading ? (
          <div className="grid grid-cols-12 gap-4">
            <Skeleton className="col-span-12 lg:col-span-6 h-64" />
            <Skeleton className="col-span-6 lg:col-span-3 h-64" />
            <Skeleton className="col-span-6 lg:col-span-3 h-64" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Main KPI - Investimento Total */}
            <div className="col-span-12 lg:col-span-6">
              <KPICardLarge
                title="Faturamento mensal (atual)"
                value={formatCurrency(kpiData?.totalSpend || 0)}
                icon={DollarSign}
                trend={{ value: 12.5, isPositive: true }}
                chartData={miniChartData}
                chartColor="hsl(25 95% 53%)"
              />
            </div>

            {/* Smart Projection AI */}
            <div className="col-span-6 lg:col-span-3">
              <SmartProjectionCard
                projectedValue={(kpiData?.totalSpend || 0) * 1.25}
                confidence={78}
              />
            </div>

            {/* Profit Card */}
            <div className="col-span-6 lg:col-span-3">
              <ProfitCard
                value={(kpiData?.totalSpend || 0) * 0.35}
                percentage={100}
              />
            </div>
          </div>
        )}

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  title="Clientes Meta"
                  value={kpiData.activeClientsMeta}
                  icon={Users}
                />
                <KPICard
                  title="Clientes Google"
                  value={kpiData.activeClientsGoogle}
                  icon={Users}
                />
                <KPICard
                  title="Leads"
                  value={kpiData.leads.toLocaleString()}
                  icon={Target}
                />
                <KPICard
                  title="CTR Médio"
                  value={`${kpiData.avgCTR.toFixed(2)}%`}
                  icon={TrendingUp}
                />
                <KPICard
                  title="CPL Médio"
                  value={formatCurrency(kpiData.avgCPL)}
                  icon={BarChart3}
                />
                <KPICard
                  title="Investimento"
                  value={formatCurrency(kpiData.totalSpend)}
                  icon={DollarSign}
                />
              </>
            )
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Chart */}
          <Card className="card-dark border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
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
          <Card className="card-dark border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
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
          <Card className="card-dark border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                Estatísticas de Automação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/30">
                    <span className="text-muted-foreground">Envios WhatsApp</span>
                    <span className="font-bold text-foreground">{(automationStats?.whatsappSends ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/30">
                    <span className="text-muted-foreground">Relatórios Enviados</span>
                    <span className="font-bold text-foreground">{(automationStats?.reportsSent ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/30">
                    <span className="text-muted-foreground">Leads Sincronizados</span>
                    <span className="font-bold text-foreground">{(automationStats?.leadsSynced ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-dark border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Criativos com Melhor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-3">
                  {(topCreatives ?? []).map((creative) => (
                    <div
                      key={creative.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <span className="font-medium text-foreground">{creative.name}</span>
                      <div className="flex gap-6 text-sm">
                        <span className="text-muted-foreground">
                          CTR: <span className="text-primary font-bold">{creative.ctr.toFixed(2)}%</span>
                        </span>
                        <span className="text-muted-foreground">
                          Hook:{" "}
                          <span className="text-success font-bold">{creative.hookRate.toFixed(1)}%</span>
                        </span>
                      </div>
                    </div>
                  ))}
                  {topCreatives.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
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
