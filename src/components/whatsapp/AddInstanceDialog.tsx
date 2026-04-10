import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { evolutionApiService } from "@/services/evolutionApiService";
import { toast } from "sonner";
import { Loader2, Link, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddInstanceDialog({ open, onOpenChange, onAdded }: AddInstanceDialogProps) {
  const [tab, setTab] = useState<string>("existing");
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  // New instance form
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch all Evolution instances for "existing" tab
  const { data: allInstances, isLoading } = useQuery({
    queryKey: ["evolution-all-instances"],
    queryFn: () => evolutionApiService.listAllEvolutionInstances(),
    enabled: open && tab === "existing",
  });

  const instanceList = Array.isArray(allInstances) ? allInstances : [];
  const filtered = instanceList.filter((inst: any) => {
    const name = inst?.name || inst?.instance?.instanceName || inst?.instanceName || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleLink = async (instanceName: string) => {
    setLinking(instanceName);
    try {
      await evolutionApiService.linkInstance(instanceName);
      try {
        await evolutionApiService.syncGroups(instanceName);
      } catch (syncErr) {
        console.warn("Falha ao sincronizar grupos após vincular:", syncErr);
      }
      toast.success(`Instância "${instanceName}" vinculada com sucesso!`);
      onAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLinking(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await evolutionApiService.createInstance(newName.trim(), newNumber.trim() || undefined);
      try {
        await evolutionApiService.syncGroups(newName.trim());
      } catch (syncErr) {
        console.warn("Falha ao sincronizar grupos após criar:", syncErr);
      }
      toast.success(`Instância "${newName}" criada e vinculada!`);
      setNewName("");
      setNewNumber("");
      onAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar Instância WhatsApp</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">
              <Link className="h-4 w-4 mr-1" />
              Vincular Existente
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              Criar Nova
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar instância na Evolution..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando instâncias...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {instanceList.length === 0 ? "Nenhuma instância encontrada na Evolution API." : "Nenhuma instância corresponde à busca."}
                </p>
              ) : (
              filtered.map((inst: any, idx: number) => {
                  const name = inst?.name
                    || inst?.instance?.instanceName
                    || inst?.instanceName
                    || `instance-${idx}`;
                  const status = inst?.connectionStatus
                    || inst?.instance?.connectionStatus
                    || inst?.instance?.status
                    || "unknown";
                  const isOpen = status === "open" || status === "connected";

                  return (
                    <Card key={name + idx} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{name}</p>
                        <Badge variant={isOpen ? "default" : "secondary"} className="text-xs mt-1">
                          {isOpen ? "Online" : status}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        disabled={linking === name}
                        onClick={() => handleLink(name)}
                      >
                        {linking === name ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
                      </Button>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-name">Nome da instância *</Label>
              <Input
                id="new-name"
                placeholder="Ex: minha-empresa"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-number">Número (opcional)</Label>
              <Input
                id="new-number"
                placeholder="Ex: 5511999999999"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se informado, a conexão será feita por código de pareamento
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Criar e Vincular
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
