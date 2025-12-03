import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemandaCard } from "./DemandaCard";
import { demandasService, type Demanda, type DemandaStatus } from "@/services/demandasService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  demandas: Demanda[];
  onEdit: (demanda: Demanda) => void;
  onRefresh: () => void;
}

const columns: { id: DemandaStatus; title: string; color: string }[] = [
  { id: "pendente", title: "Pendentes", color: "bg-yellow-500" },
  { id: "em_andamento", title: "Em Andamento", color: "bg-blue-500" },
  { id: "concluido", title: "Concluídos", color: "bg-green-500" },
];

export function KanbanBoard({ demandas, onEdit, onRefresh }: KanbanBoardProps) {
  const [draggedDemanda, setDraggedDemanda] = useState<Demanda | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DemandaStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, demanda: Demanda) => {
    setDraggedDemanda(demanda);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: DemandaStatus) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: DemandaStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedDemanda || draggedDemanda.status === newStatus) {
      setDraggedDemanda(null);
      return;
    }

    try {
      await demandasService.updateStatus(draggedDemanda.id, newStatus);
      toast.success("Status atualizado!");
      onRefresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setDraggedDemanda(null);
    }
  };

  const getDemandasByStatus = (status: DemandaStatus) => {
    return demandas.filter((d) => d.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {columns.map((column) => {
        const columnDemandas = getDemandasByStatus(column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              "flex flex-col rounded-lg border bg-muted/30 transition-colors",
              isDragOver && "ring-2 ring-primary bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center gap-2 p-3 border-b">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {columnDemandas.length}
              </span>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {columnDemandas.map((demanda) => (
                  <DemandaCard
                    key={demanda.id}
                    demanda={demanda}
                    onEdit={onEdit}
                    onDragStart={handleDragStart}
                  />
                ))}
                {columnDemandas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma demanda
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
