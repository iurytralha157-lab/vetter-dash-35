import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";

const etapaColors: Record<string, string> = {
  lead_novo: "bg-blue-100 text-blue-800",
  contato_iniciado: "bg-cyan-100 text-cyan-800",
  sem_resposta: "bg-gray-100 text-gray-800",
  atendimento: "bg-yellow-100 text-yellow-800",
  visita_agendada: "bg-emerald-100 text-emerald-800",
  visita_realizada: "bg-green-100 text-green-800",
  proposta: "bg-violet-100 text-violet-800",
  venda: "bg-green-200 text-green-900",
  perdido: "bg-red-100 text-red-800",
};

const tempColors: Record<string, string> = {
  frio: "bg-blue-50 text-blue-700",
  morno: "bg-amber-50 text-amber-700",
  quente: "bg-red-50 text-red-700",
};

const etapaLabels: Record<string, string> = {
  lead_novo: "Lead Novo",
  contato_iniciado: "Contato Iniciado",
  sem_resposta: "Sem Resposta",
  atendimento: "Atendimento",
  visita_agendada: "Visita Agendada",
  visita_realizada: "Visita Realizada",
  proposta: "Proposta",
  venda: "Venda",
  perdido: "Perdido",
};

interface Props {
  rows: any[];
  onViewDetail: (row: any) => void;
}

export function FunnelTable({ rows, onViewDetail }: Props) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px]">Data</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead className="max-w-[200px]">Mensagem</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Temp.</TableHead>
            <TableHead className="max-w-[180px]">Resumo</TableHead>
            <TableHead>Próxima Ação</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Conf.</TableHead>
            <TableHead>Dup.</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={row.duplicado ? "opacity-50" : ""}>
              <TableCell className="text-xs whitespace-nowrap">
                {row.created_at ? format(new Date(row.created_at), "dd/MM/yy HH:mm") : "-"}
              </TableCell>
              <TableCell className="text-sm font-medium whitespace-nowrap">
                {row._account_name || "-"}
              </TableCell>
              <TableCell className="text-sm">{row.nome_origem || "-"}</TableCell>
              <TableCell className="text-sm font-medium">{row.lead_nome || "-"}</TableCell>
              <TableCell className="text-xs max-w-[200px] truncate">{row.mensagem_original || "-"}</TableCell>
              <TableCell>
                {row.etapa_funil ? (
                  <Badge variant="outline" className={`text-xs ${etapaColors[row.etapa_funil] || ""}`}>
                    {etapaLabels[row.etapa_funil] || row.etapa_funil}
                  </Badge>
                ) : "-"}
              </TableCell>
              <TableCell className="text-xs">{row.status_lead || "-"}</TableCell>
              <TableCell>
                {row.temperatura_lead ? (
                  <Badge variant="outline" className={`text-xs ${tempColors[row.temperatura_lead] || ""}`}>
                    {row.temperatura_lead}
                  </Badge>
                ) : "-"}
              </TableCell>
              <TableCell className="text-xs max-w-[180px] truncate">{row.resumo || "-"}</TableCell>
              <TableCell className="text-xs">{row.proxima_acao || "-"}</TableCell>
              <TableCell className="text-xs">{row.responsavel_sugerido || "-"}</TableCell>
              <TableCell className="text-xs">
                {row.confianca != null ? `${Math.round(row.confianca * 100)}%` : "-"}
              </TableCell>
              <TableCell>{row.duplicado ? "Sim" : "Não"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onViewDetail(row)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
