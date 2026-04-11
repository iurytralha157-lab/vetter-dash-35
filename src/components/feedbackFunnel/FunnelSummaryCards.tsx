import { Card, CardContent } from "@/components/ui/card";
import { Flame, Eye, FileText, Trophy, XCircle, BarChart3 } from "lucide-react";

interface FunnelStats {
  total: number;
  quentes: number;
  visitas: number;
  propostas: number;
  vendas: number;
  perdidos: number;
}

export function FunnelSummaryCards({ stats }: { stats: FunnelStats }) {
  const cards = [
    { label: "Total Registros", value: stats.total, icon: BarChart3, color: "text-blue-500" },
    { label: "Leads Quentes", value: stats.quentes, icon: Flame, color: "text-orange-500" },
    { label: "Visitas", value: stats.visitas, icon: Eye, color: "text-emerald-500" },
    { label: "Propostas", value: stats.propostas, icon: FileText, color: "text-violet-500" },
    { label: "Vendas", value: stats.vendas, icon: Trophy, color: "text-green-600" },
    { label: "Perdidos", value: stats.perdidos, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <span className="text-2xl font-bold">{c.value}</span>
            <span className="text-xs text-muted-foreground text-center">{c.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
