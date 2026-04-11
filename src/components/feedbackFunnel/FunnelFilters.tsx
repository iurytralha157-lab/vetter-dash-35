import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { FeedbackFunnelFilters } from "@/services/feedbackFunnelService";

const ETAPAS = [
  { value: "lead_novo", label: "Lead Novo" },
  { value: "contato_iniciado", label: "Contato Iniciado" },
  { value: "sem_resposta", label: "Sem Resposta" },
  { value: "atendimento", label: "Atendimento" },
  { value: "visita_agendada", label: "Visita Agendada" },
  { value: "visita_realizada", label: "Visita Realizada" },
  { value: "proposta", label: "Proposta" },
  { value: "venda", label: "Venda" },
  { value: "perdido", label: "Perdido" },
];

const STATUS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

const TEMPERATURAS = [
  { value: "frio", label: "Frio" },
  { value: "morno", label: "Morno" },
  { value: "quente", label: "Quente" },
];

interface Props {
  filters: FeedbackFunnelFilters;
  onChange: (filters: FeedbackFunnelFilters) => void;
  accountsMap: Record<string, string>;
}

export function FunnelFilters({ filters, onChange, accountsMap }: Props) {
  const update = (key: keyof FeedbackFunnelFilters, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const clear = () => onChange({});

  const hasFilters = Object.values(filters).some(Boolean);

  const accountEntries = Object.entries(accountsMap).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Conta</label>
        <Select value={filters.account_id || ""} onValueChange={(v) => update("account_id", v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
          <SelectContent>
            {accountEntries.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Etapa Funil</label>
        <Select value={filters.etapa_funil || ""} onValueChange={(v) => update("etapa_funil", v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            {ETAPAS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <Select value={filters.status_lead || ""} onValueChange={(v) => update("status_lead", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Temperatura</label>
        <Select value={filters.temperatura_lead || ""} onValueChange={(v) => update("temperatura_lead", v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            {TEMPERATURAS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">De</label>
        <Input type="date" value={filters.date_from || ""} onChange={(e) => update("date_from", e.target.value)} className="w-[150px]" />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Até</label>
        <Input type="date" value={filters.date_to || ""} onChange={(e) => update("date_to", e.target.value)} className="w-[150px]" />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="flex items-center gap-1">
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}
