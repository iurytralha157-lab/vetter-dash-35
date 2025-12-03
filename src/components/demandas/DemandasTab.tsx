import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";
import { DemandaFormDialog } from "./DemandaFormDialog";
import { demandasService, type Demanda } from "@/services/demandasService";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function DemandasTab() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);

  const loadDemandas = async () => {
    try {
      setLoading(true);
      const data = await demandasService.getDemandas();
      setDemandas(data);
    } catch (error) {
      console.error("Error loading demandas:", error);
      toast.error("Erro ao carregar demandas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemandas();
  }, []);

  const handleEdit = (demanda: Demanda) => {
    setEditingDemanda(demanda);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingDemanda(null);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    loadDemandas();
    setEditingDemanda(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[500px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Quadro de Demandas</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDemandas}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Demanda
          </Button>
        </div>
      </div>

      <KanbanBoard
        demandas={demandas}
        onEdit={handleEdit}
        onRefresh={loadDemandas}
      />

      <DemandaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        demanda={editingDemanda}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
