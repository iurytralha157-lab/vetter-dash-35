import { Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SmartProjectionCardProps {
  projectedValue?: number;
  confidence?: number;
  label?: string;
}

export function SmartProjectionCard({
  projectedValue = 156000,
  confidence = 78,
  label = "Projeção para os próximos 30 dias",
}: SmartProjectionCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="card-ai p-6 h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header with AI indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-accent-ai/20 glow-purple">
            <Sparkles className="h-4 w-4 text-brand-purple-light" />
          </div>
          <span className="text-sm font-medium text-brand-purple-light">
            Smart Projection AI
          </span>
        </div>

        {/* Projected value */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Projeção de Faturamento
          </p>
          <div className="text-3xl font-bold text-foreground mb-4">
            {formatCurrency(projectedValue)}
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confiança</span>
            <span className="font-medium text-brand-purple-light">{confidence}%</span>
          </div>
          <Progress 
            value={confidence} 
            className="h-2 bg-brand-purple/20"
          />
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-purple/20">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
