import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProfitCardProps {
  value?: number;
  percentage?: number;
  label?: string;
}

export function ProfitCard({
  value = 42500,
  percentage = 100,
  label = "Lucro Líquido",
}: ProfitCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Calculate circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="card-success p-6 h-full">
      <CardContent className="p-0 flex flex-col items-center justify-center h-full">
        {/* Label */}
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
          {label}
        </p>

        {/* Circular progress with value */}
        <div className="relative">
          <svg width="120" height="120" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="hsl(var(--success) / 0.2)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="hsl(var(--success))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out glow-green"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Value */}
        <div className="text-center mt-4">
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(value)}
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-success" />
            <span className="text-xs text-success">Meta atingida</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
