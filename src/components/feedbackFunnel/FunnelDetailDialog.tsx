import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Props {
  row: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FunnelDetailDialog({ row, open, onOpenChange }: Props) {
  if (!row) return null;

  const fields = [
    { label: "Lead", value: row.lead_nome },
    { label: "Telefone Lead", value: row.lead_telefone },
    { label: "Etapa Funil", value: row.etapa_funil },
    { label: "Status", value: row.status_lead },
    { label: "Temperatura", value: row.temperatura_lead },
    { label: "Resumo", value: row.resumo },
    { label: "Próxima Ação", value: row.proxima_acao },
    { label: "Data Próxima Ação", value: row.data_proxima_acao },
    { label: "Responsável", value: row.responsavel_sugerido },
    { label: "Campanha", value: row.campanha_nome },
    { label: "Confiança", value: row.confianca != null ? `${Math.round(row.confianca * 100)}%` : null },
    { label: "Score Intenção", value: row.score_intencao },
    { label: "Modelo IA", value: row.ai_modelo },
    { label: "Versão Prompt", value: row.ai_prompt_versao },
    { label: "Status Processamento", value: row.processamento_status },
    { label: "Erro", value: row.processamento_erro },
    { label: "Duplicado", value: row.duplicado ? "Sim" : "Não" },
    { label: "Grupo", value: row.id_grupo },
    { label: "Origem", value: row.nome_origem },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhe do Follow-up
            {row.etapa_funil && <Badge variant="outline">{row.etapa_funil}</Badge>}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data</p>
              <p className="text-sm">{row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss") : "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Mensagem Original</p>
              <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{row.mensagem_original}</p>
            </div>

            {row.mensagem_normalizada && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensagem Normalizada</p>
                <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{row.mensagem_normalizada}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                f.value != null && (
                  <div key={f.label}>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-medium">{String(f.value)}</p>
                  </div>
                )
              ))}
            </div>

            {row.ai_json && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Resposta Completa da IA (JSON)</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(row.ai_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
