import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evolutionApiService } from "@/services/evolutionApiService";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateInstanceDialog({ open, onOpenChange, onCreated }: CreateInstanceDialogProps) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const result = await evolutionApiService.createInstance(name.trim(), number.trim() || undefined);
      toast.success(`Instância "${name}" criada com sucesso!`);

      // If QR code returned, show it
      if (result?.qrcode?.base64) {
        toast.info("Escaneie o QR Code para conectar o WhatsApp", { duration: 10000 });
      }

      setName("");
      setNumber("");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar instância");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instância WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="instance-name">Nome da instância *</Label>
            <Input
              id="instance-name"
              placeholder="Ex: minha-empresa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="instance-number">Número (opcional)</Label>
            <Input
              id="instance-number"
              placeholder="Ex: 5511999999999"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se informado, a conexão será feita por código de pareamento
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
