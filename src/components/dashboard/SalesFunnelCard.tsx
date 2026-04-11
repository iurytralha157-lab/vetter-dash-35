import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number | null;
  color: string;
}

interface SalesFunnelCardProps {
  title: string;
  subtitle?: string;
  totalLeads: number | null;
  leadsRecebidos: number | null;
  steps: FunnelStep[];
}

export function SalesFunnelCard({ title, subtitle, totalLeads, leadsRecebidos, steps }: SalesFunnelCardProps) {
  // Filter out steps where value is null (not informed)
  const visibleSteps = steps.filter(s => s.value !== null && s.value !== undefined);
  const recebidos = leadsRecebidos ?? 0;
  const total = totalLeads ?? recebidos;

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
          {/* Total de Leads - only show if we have data */}
          {total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{total} Total de Leads</span>
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
          )}

          {/* Leads Recebidos */}
          {leadsRecebidos !== null && leadsRecebidos !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">
                  {recebidos} Leads Recebidos
                  {total > 0 && recebidos > 0 && ` (${Math.round((recebidos / total) * 100)}%)`}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                  style={{
                    width: total > 0 ? `${Math.max((recebidos / total) * 100, 12)}%` : "12%",
                    backgroundColor: "#06b6d4",
                  }}
                >
                  {total > 0 ? `${Math.round((recebidos / total) * 100)}%` : ""}
                </div>
              </div>
            </div>
          )}

          {/* Steps - only show steps that have data */}
          {visibleSteps.map((step, idx) => {
            const val = step.value!;
            const pct = recebidos > 0 ? Math.round((val / recebidos) * 100) : 0;
            const barWidth = recebidos > 0
              ? Math.max((val / recebidos) * 100, val > 0 ? 12 : 4)
              : 4;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">
                    {val} {step.label} {val > 0 && recebidos > 0 ? `(${pct}%)` : ""}
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

          {/* No data message */}
          {leadsRecebidos === null && visibleSteps.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum dado informado ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
