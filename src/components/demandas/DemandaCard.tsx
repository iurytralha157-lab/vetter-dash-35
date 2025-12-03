import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, ExternalLink, Pencil, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Demanda } from "@/services/demandasService";

interface DemandaCardProps {
  demanda: Demanda;
  onEdit: (demanda: Demanda) => void;
  onDragStart: (e: React.DragEvent, demanda: Demanda) => void;
}

const prioridadeConfig = {
  alta: { label: "Alta", variant: "destructive" as const },
  media: { label: "Média", variant: "default" as const },
  baixa: { label: "Baixa", variant: "secondary" as const },
};

export function DemandaCard({ demanda, onEdit, onDragStart }: DemandaCardProps) {
  const prioridade = prioridadeConfig[demanda.prioridade];

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, demanda)}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{demanda.titulo}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onEdit(demanda)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        <Badge variant={prioridade.variant} className="w-fit text-xs">
          {prioridade.label}
        </Badge>
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
            <span>{format(new Date(demanda.data_entrega), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        )}

        {demanda.link_criativos && (
          <a
            href={demanda.link_criativos}
            target="_blank"
            rel="noopener noreferrer"
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
