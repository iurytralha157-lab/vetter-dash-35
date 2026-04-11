import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface SalesFunnelCardProps {
  title: string;
  subtitle?: string;
  totalLeads: number;
  leadsRecebidos: number;
  steps: FunnelStep[];
}

export function SalesFunnelCard({ title, subtitle, totalLeads, leadsRecebidos, steps }: SalesFunnelCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {/* Total de Leads */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{totalLeads} Total de Leads</span>
            </div>
            <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                style={{ width: "100%", backgroundColor: "#3b82f6" }}
              >
                100%
              </div>
            </div>
          </div>

          {/* Leads Recebidos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">
                {leadsRecebidos} Leads Recebidos
                {totalLeads > 0 && ` (${Math.round((leadsRecebidos / totalLeads) * 100)}%)`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                style={{
                  width: totalLeads > 0 ? `${Math.max((leadsRecebidos / totalLeads) * 100, 12)}%` : "12%",
                  backgroundColor: "#06b6d4",
                }}
              >
                {totalLeads > 0 ? `${Math.round((leadsRecebidos / totalLeads) * 100)}%` : ""}
              </div>
            </div>
          </div>

          {/* Steps */}
          {steps.map((step, idx) => {
            const pct = leadsRecebidos > 0 ? Math.round((step.value / leadsRecebidos) * 100) : 0;
            const barWidth = leadsRecebidos > 0
              ? Math.max((step.value / leadsRecebidos) * 100, step.value > 0 ? 12 : 4)
              : 4;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">
                    {step.value} {step.label} {step.value > 0 && leadsRecebidos > 0 ? `(${pct}%)` : ""}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: step.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
