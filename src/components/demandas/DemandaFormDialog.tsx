import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { demandasService, type Demanda, type CreateDemandaInput, type DemandaPrioridade, type DemandaStatus } from "@/services/demandasService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Account {
  id: string;
  nome_cliente: string;
  gestor_id: string | null;
}

interface DemandaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demanda: Demanda | null;
  onSuccess: () => void;
}

export function DemandaFormDialog({ open, onOpenChange, demanda, onSuccess }: DemandaFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    account_id: "",
    orcamento: "",
    link_criativos: "",
    data_entrega: "",
    prioridade: "media" as DemandaPrioridade,
    status: "pendente" as DemandaStatus,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (demanda) {
      setForm({
        titulo: demanda.titulo,
        descricao: demanda.descricao || "",
        account_id: demanda.account_id,
        orcamento: demanda.orcamento?.toString() || "",
        link_criativos: demanda.link_criativos || "",
        data_entrega: demanda.data_entrega || "",
        prioridade: demanda.prioridade,
        status: demanda.status,
      });
    } else {
      setForm({
        titulo: "",
        descricao: "",
        account_id: "",
        orcamento: "",
        link_criativos: "",
        data_entrega: "",
        prioridade: "media",
        status: "pendente",
      });
    }
  }, [demanda, open]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("id, nome_cliente, gestor_id")
      .eq("status", "Ativo")
      .order("nome_cliente");
    setAccounts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.account_id) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const selectedAccount = accounts.find((a) => a.id === form.account_id);
      const input: CreateDemandaInput = {
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        account_id: form.account_id,
        gestor_responsavel_id: selectedAccount?.gestor_id || undefined,
        orcamento: form.orcamento ? parseFloat(form.orcamento) : undefined,
        link_criativos: form.link_criativos || undefined,
        data_entrega: form.data_entrega || undefined,
        prioridade: form.prioridade,
      };

      if (demanda) {
        await demandasService.updateDemanda(demanda.id, {
          ...input,
          status: form.status,
        } as Partial<Demanda>);
        toast.success("Demanda atualizada!");
      } else {
        await demandasService.createDemanda(input);
        toast.success("Demanda criada!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving demanda:", error);
      toast.error("Erro ao salvar demanda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{demanda ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Subir campanha MCMV"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Conta *</Label>
            <Select
              value={form.account_id}
              onValueChange={(value) => setForm({ ...form, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nome_cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva os detalhes da demanda..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orcamento">Orçamento</Label>
              <Input
                id="orcamento"
                type="number"
                value={form.orcamento}
                onChange={(e) => setForm({ ...form, orcamento: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={form.prioridade}
                onValueChange={(value: DemandaPrioridade) => setForm({ ...form, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_entrega">Data de Entrega</Label>
            <Input
              id="data_entrega"
              type="date"
              value={form.data_entrega}
              onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_criativos">Link dos Criativos (Drive)</Label>
            <Input
              id="link_criativos"
              value={form.link_criativos}
              onChange={(e) => setForm({ ...form, link_criativos: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>

          {demanda && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: DemandaStatus) => setForm({ ...form, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {demanda ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
