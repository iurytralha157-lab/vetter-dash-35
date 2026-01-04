import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface KPICardLargeProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  chartData?: Array<{ value: number }>;
  chartColor?: string;
}

export function KPICardLarge({
  title,
  value,
  icon: Icon,
  trend,
  chartData = [],
  chartColor = "hsl(var(--primary))",
}: KPICardLargeProps) {
  return (
    <Card className="card-dark p-6 h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="text-4xl font-bold text-foreground mb-2">
          {value}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs período anterior</span>
          </div>
        )}

        {/* Mini Chart */}
        {chartData.length > 0 && (
          <div className="flex-1 min-h-[80px] mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ display: "none" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
