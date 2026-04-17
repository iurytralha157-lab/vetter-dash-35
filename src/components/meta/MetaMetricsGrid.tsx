import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Target, DollarSign, Users, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import type { MetaAccountMetrics, MetaAccountBalance } from "@/types/meta";

interface MetaMetricsGridProps {
  metrics: MetaAccountMetrics | null;
  loading: boolean;
  balance?: MetaAccountBalance | null;
}

export function MetaMetricsGrid({ metrics, loading, balance }: MetaMetricsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const conversionRate = metrics && metrics.total_conversions > 0 
    ? (metrics.total_conversions / metrics.total_clicks) * 100 
    : 0;

  const balanceMode = balance?.balance_mode ?? 'unknown';
  const hasPaymentIssue = balance?.has_payment_issue ?? false;
  const isCardMode = ['card_ok', 'card_and_funds', 'card_failing'].includes(balanceMode);
  const shouldMonitorFunds = ['funds', 'prepay', 'unknown'].includes(balanceMode);
  const isLowBalance = Boolean(balance && shouldMonitorFunds && balance.balance <= 0);

  const metricsData = [
    {
      title: 'Total de Leads',
      value: metrics ? formatNumber(metrics.total_conversions) : '0',
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20'
    },
    {
      title: 'Leads Convertidos',
      value: metrics ? formatNumber(metrics.total_conversions) : '0',
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10 dark:bg-green-500/20'
    },
    {
      title: 'Taxa Conversão',
      value: metrics ? formatPercentage(conversionRate) : '0.0%',
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20'
    },
    {
      title: 'Investimento Total',
      value: metrics ? formatCurrency(metrics.total_spend) : 'R$ 0',
      icon: DollarSign,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="surface-elevated">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Balance Card - first position */}
      <Card 
        className={`surface-elevated hover:shadow-lg transition-all duration-200 ${
          hasPaymentIssue 
            ? 'border-destructive/50' 
            : isLowBalance 
              ? 'border-red-500/50' 
              : 'border-emerald-500/30'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              {isCardMode && !hasPaymentIssue
                ? 'Cartão Ativo'
                : balance?.funds_amount !== null && balance?.funds_amount !== undefined
                ? 'Fundos'
                : balance?.is_prepay_account
                  ? 'Saldo Pré-pago'
                  : 'Saldo Devedor'}
            </p>
            <div className={`p-2 rounded-lg ${hasPaymentIssue ? 'bg-red-500/10' : 'bg-emerald-500/10 dark:bg-emerald-500/20'}`}>
              {hasPaymentIssue 
                ? <AlertTriangle className="h-5 w-5 text-destructive" /> 
                : <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              }
            </div>
          </div>
          <p className={`text-3xl font-bold ${
            hasPaymentIssue 
              ? 'text-destructive' 
              : isLowBalance 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            {balance ? formatCurrency(balance.balance) : 'R$ —'}
          </p>
          {isCardMode && !hasPaymentIssue && (
            <p className="text-xs text-muted-foreground mt-1">
              Alerta apenas se houver falha de cobrança
            </p>
          )}
          {balanceMode === 'card_and_funds' && balance?.funds_amount !== null && balance?.funds_amount !== undefined && balance.debt_amount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Saldo devedor: {formatCurrency(balance.debt_amount)}
            </p>
          )}
          {balance?.funding_source_type && !hasPaymentIssue && (
            <p className="text-xs text-muted-foreground mt-1">
              {balance.funding_source_type === 'credit_card' ? '💳 Cartão' 
                : balance.funding_source_type === 'pix' ? '📱 PIX'
                : balance.funding_source_type === 'boleto' ? '📄 Boleto'
                : balance.funding_source_type === 'funds' ? '💰 Fundos'
                : ''}
            </p>
          )}
          {hasPaymentIssue && (
            <Badge variant="destructive" className="mt-2 text-xs">Problema pagamento</Badge>
          )}
          {isLowBalance && !hasPaymentIssue && (
            <Badge variant="outline" className="mt-2 text-xs border-red-500/50 text-red-600">Sem saldo</Badge>
          )}
          {balanceMode === 'card_ok' && !hasPaymentIssue && (
            <Badge variant="outline" className="mt-2 text-xs">Cartão ativo</Badge>
          )}
        </CardContent>
      </Card>

      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={index} 
            className="surface-elevated hover:shadow-lg transition-all duration-200 border-border/50"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{metric.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
