import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, ExternalLink, Pencil, User, Timer } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Demanda } from "@/services/demandasService";

interface DemandaCardProps {
  demanda: Demanda;
  onEdit: (demanda: Demanda) => void;
  onClick: (demanda: Demanda) => void;
  onDragStart: (e: React.DragEvent, demanda: Demanda) => void;
}

const prioridadeConfig = {
  alta: { label: "Alta", variant: "destructive" as const },
  media: { label: "Média", variant: "default" as const },
  baixa: { label: "Baixa", variant: "secondary" as const },
};

export function DemandaCard({ demanda, onEdit, onClick, onDragStart }: DemandaCardProps) {
  const prioridade = prioridadeConfig[demanda.prioridade];

  const getTimeInStatus = () => {
    if (demanda.status === "pendente") {
      return formatDistanceToNow(new Date(demanda.created_at), {
        locale: ptBR,
        addSuffix: false,
      });
    } else if (demanda.status === "em_andamento" && demanda.em_andamento_at) {
      return formatDistanceToNow(new Date(demanda.em_andamento_at), {
        locale: ptBR,
        addSuffix: false,
      });
    }
    return null;
  };

  const timeInStatus = getTimeInStatus();

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, demanda)}
      onClick={() => onClick(demanda)}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{demanda.titulo}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(demanda);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={prioridade.variant} className="w-fit text-xs">
            {prioridade.label}
          </Badge>
          {/* Timer - só mostra se não estiver concluído */}
          {timeInStatus && demanda.status !== "concluido" && (
            <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
              <Timer className="h-3 w-3" />
              <span>{timeInStatus}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {demanda.account && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{demanda.account.nome_cliente}</span>
          </div>
        )}
        
        {demanda.orcamento && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(demanda.orcamento)}
            </span>
          </div>
        )}

        {demanda.data_entrega && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(demanda.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
              {demanda.hora_entrega && ` às ${demanda.hora_entrega.slice(0, 5)}`}
            </span>
          </div>
        )}

        {demanda.link_criativos && (
          <a
            href={demanda.link_criativos}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Ver criativos</span>
          </a>
        )}

        {demanda.gestor && (
          <div className="pt-1 border-t">
            <span className="text-xs text-muted-foreground">
              Responsável: {demanda.gestor.name || demanda.gestor.email}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
