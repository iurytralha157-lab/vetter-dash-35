import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Bell,
  RefreshCw
} from "lucide-react";
import { healthService, SmartAlert } from "@/services/healthService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const severityConfig = {
  info: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' }
};

function AlertCard({ alert, onResolve }: { alert: SmartAlert; onResolve: () => void }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${config.color} shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {alert.alert_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(alert.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
            <p className="text-sm font-medium mb-1">{alert.message}</p>
            {alert.account && (
              <p className="text-xs text-muted-foreground">
                Conta: {alert.account.nome_cliente}
              </p>
            )}
          </div>
          {!alert.is_resolved && (
            <Button size="sm" variant="outline" onClick={onResolve}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIcon = () => {
    if (score >= 80) return <TrendingUp className="h-5 w-5" />;
    if (score >= 60) return <Activity className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${getColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Health Score</span>
          <span className={`text-lg font-bold ${getColor()}`}>{score}</span>
        </div>
        <Progress 
          value={score} 
          className="h-2"
        />
      </div>
    </div>
  );
}

export default function SmartChecklist() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: () => healthService.getAlerts(false)
  });

  const { data: healthScores, isLoading: loadingHealth } = useQuery({
    queryKey: ['health-scores'],
    queryFn: () => healthService.getHealthScores()
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => healthService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      toast.success('Alerta resolvido');
    },
    onError: () => {
      toast.error('Erro ao resolver alerta');
    }
  });

  const criticalAlerts = alerts?.filter(a => a.severity === 'critical') || [];
  const warningAlerts = alerts?.filter(a => a.severity === 'warning') || [];
  const infoAlerts = alerts?.filter(a => a.severity === 'info') || [];

  // Calcular score médio
  const avgScore = healthScores && healthScores.length > 0
    ? Math.round(healthScores.reduce((acc, h) => acc + (h.score || 0), 0) / healthScores.length)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Smart Checklist
            </h1>
            <p className="text-muted-foreground">Monitoramento de saúde das contas</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
              queryClient.invalidateQueries({ queryKey: ['health-scores'] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <ScoreGauge score={avgScore} />
            </CardContent>
          </Card>
          
          <Card className={criticalAlerts.length > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                  <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={warningAlerts.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avisos</p>
                  <p className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Informações</p>
                  <p className="text-2xl font-bold text-blue-600">{infoAlerts.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="space-y-6">
          {/* Critical */}
          {criticalAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Alertas Críticos
              </h2>
              <div className="space-y-3">
                {criticalAlerts.map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert}
                    onResolve={() => resolveMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warningAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Avisos
              </h2>
              <div className="space-y-3">
                {warningAlerts.map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert}
                    onResolve={() => resolveMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {infoAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-600">
                <Bell className="h-5 w-5" />
                Informações
              </h2>
              <div className="space-y-3">
                {infoAlerts.map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert}
                    onResolve={() => resolveMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingAlerts && (!alerts || alerts.length === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Tudo certo!</h3>
                <p className="text-muted-foreground">
                  Não há alertas pendentes no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
