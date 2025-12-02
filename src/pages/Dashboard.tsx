import { useState, useEffect } from "react";
import { Users, DollarSign, Target, TrendingUp, BarChart3, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodSelector, Period } from "@/components/dashboard/PeriodSelector";
import { dashboardService, KPIData, ChartDataPoint } from "@/mocks/dashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [kpis, chart] = await Promise.all([
          dashboardService.getKPIData(period),
          dashboardService.getChartData(period)
        ]);
        setKpiData(kpis);
        setChartData(chart);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
            <p className="text-muted-foreground mt-1">
              Overview of your advertising performance
            </p>
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
                  title="Active Clients (Meta)"
                  value={kpiData.activeClientsMeta}
                  icon={Users}
                  description="Clients with active Meta campaigns"
                />
                <KPICard
                  title="Active Clients (Google)"
                  value={kpiData.activeClientsGoogle}
                  icon={Users}
                  description="Clients with active Google campaigns"
                />
                <KPICard
                  title="Total Spend"
                  value={formatCurrency(kpiData.totalSpend)}
                  icon={DollarSign}
                  description={`${period === '30d' ? 'This month' : `Last ${period.replace('d', ' days')}`}`}
                  trend={{ value: 12.5, isPositive: true }}
                />
                <KPICard
                  title="Leads Generated"
                  value={kpiData.leads.toLocaleString()}
                  icon={Target}
                  description={`${period === '30d' ? 'This month' : `Last ${period.replace('d', ' days')}`}`}
                  trend={{ value: 8.2, isPositive: true }}
                />
                <KPICard
                  title="Average CTR"
                  value={`${kpiData.avgCTR.toFixed(2)}%`}
                  icon={TrendingUp}
                  description="Click-through rate across all campaigns"
                  trend={{ value: 1.4, isPositive: true }}
                />
                <KPICard
                  title="Average CPL"
                  value={formatCurrency(kpiData.avgCPL)}
                  icon={BarChart3}
                  description="Cost per lead across all campaigns"
                  trend={{ value: 3.2, isPositive: false }}
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
                Leads Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px"
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
                Daily Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px"
                      }}
                    />
                    <Bar 
                      dataKey="spend" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
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
                Automation Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp Sends</span>
                  <span className="font-medium">2,340</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reports Sent</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leads Synced</span>
                  <span className="font-medium">1,890</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle>Best Performing Creatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Spring Sale Video", ctr: 4.2, hookRate: 78.5 },
                  { name: "Product Demo Carousel", ctr: 3.8, hookRate: 72.1 },
                  { name: "Testimonial Story", ctr: 3.5, hookRate: 69.8 }
                ].map((creative, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <span className="font-medium">{creative.name}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        CTR: <span className="text-foreground font-medium">{creative.ctr}%</span>
                      </span>
                      <span className="text-muted-foreground">
                        Hook Rate: <span className="text-foreground font-medium">{creative.hookRate}%</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
