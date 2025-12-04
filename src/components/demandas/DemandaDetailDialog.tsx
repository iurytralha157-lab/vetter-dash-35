import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Calendar,
  DollarSign,
  ExternalLink,
  User,
  Building2,
  History,
  Timer,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { demandasService, type Demanda, type DemandaHistorico } from "@/services/demandasService";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DemandaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demanda: Demanda | null;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500",
  em_andamento: "bg-blue-500",
  concluido: "bg-green-500",
};

const prioridadeColors: Record<string, string> = {
  alta: "bg-red-500 text-white",
  media: "bg-yellow-500 text-black",
  baixa: "bg-green-500 text-white",
};

export function DemandaDetailDialog({
  open,
  onOpenChange,
  demanda,
}: DemandaDetailDialogProps) {
  const [historico, setHistorico] = useState<DemandaHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && demanda) {
      loadHistorico();
    }
  }, [open, demanda?.id]);

  const loadHistorico = async () => {
    if (!demanda) return;
    setLoading(true);
    try {
      const data = await demandasService.getHistorico(demanda.id);
      setHistorico(data);
    } catch (error) {
      console.error("Error loading historico:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!demanda) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{demanda.titulo}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn(statusColors[demanda.status], "text-white")}>
                  {statusLabels[demanda.status]}
                </Badge>
                <Badge className={prioridadeColors[demanda.prioridade]}>
                  {demanda.prioridade.charAt(0).toUpperCase() + demanda.prioridade.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Timer */}
            {timeInStatus && demanda.status !== "concluido" && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Timer className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  <strong>{timeInStatus}</strong> em {statusLabels[demanda.status].toLowerCase()}
                </span>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Conta</p>
                  <p className="text-sm font-medium">{demanda.account?.nome_cliente || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gestor Responsável</p>
                  <p className="text-sm font-medium">{demanda.gestor?.name || "Não atribuído"}</p>
                </div>
              </div>

              {demanda.orcamento && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Orçamento</p>
                    <p className="text-sm font-medium">
                      R$ {demanda.orcamento.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              )}

              {demanda.data_entrega && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Entrega</p>
                    <p className="text-sm font-medium">
                      {format(new Date(demanda.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
                      {demanda.hora_entrega && ` às ${demanda.hora_entrega.slice(0, 5)}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <p className="text-sm font-medium">
                    {format(new Date(demanda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {demanda.concluido_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Concluída em</p>
                    <p className="text-sm font-medium">
                      {format(new Date(demanda.concluido_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {demanda.descricao && (
              <div>
                <p className="text-sm font-medium mb-1">Descrição</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {demanda.descricao}
                </p>
              </div>
            )}

            {/* Creative Link */}
            {demanda.link_criativos && (
              <div>
                <p className="text-sm font-medium mb-2">Link dos Criativos</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(demanda.link_criativos!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no Drive
                </Button>
              </div>
            )}

            <Separator />

            {/* History */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4" />
                <p className="text-sm font-medium">Histórico de Alterações</p>
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
              ) : (
                <div className="space-y-3">
                  {historico.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2",
                          statusColors[item.status_novo] || "bg-gray-400"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {item.status_anterior
                              ? `${statusLabels[item.status_anterior] || item.status_anterior} → ${statusLabels[item.status_novo] || item.status_novo}`
                              : statusLabels[item.status_novo] || item.status_novo}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.alterado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          por {item.usuario?.name || "Usuário desconhecido"}
                        </p>
                        {item.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">{item.observacao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
