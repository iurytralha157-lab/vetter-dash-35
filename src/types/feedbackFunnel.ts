// Types for the feedback_funnel module (isolated, does not modify existing types)

export type EtapaFunil =
  | "lead_novo"
  | "contato_iniciado"
  | "sem_resposta"
  | "atendimento"
  | "visita_agendada"
  | "visita_realizada"
  | "proposta"
  | "venda"
  | "perdido";

export type StatusLead = "aberto" | "em_andamento" | "ganho" | "perdido";

export type TemperaturaLead = "frio" | "morno" | "quente";

export type ProcessamentoStatus = "pendente" | "processado" | "erro" | "duplicado";

export interface FeedbackFunnelRow {
  id: number;
  created_at: string;
  updated_at: string;
  account_id: string | null;
  cliente_id: string | null;
  id_grupo: string | null;
  numero_grupo: string | null;
  telefone_origem: string | null;
  nome_origem: string | null;
  usuario_origem: string | null;
  origem: string;
  hashtag: string;
  mensagem_original: string;
  mensagem_normalizada: string | null;
  lead_nome: string | null;
  lead_telefone: string | null;
  etapa_funil: EtapaFunil | null;
  status_lead: StatusLead | null;
  temperatura_lead: TemperaturaLead | null;
  resumo: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  responsavel_sugerido: string | null;
  campanha_nome: string | null;
  campaign_id: string | null;
  confianca: number | null;
  score_intencao: number | null;
  processamento_status: ProcessamentoStatus;
  processamento_erro: string | null;
  ai_modelo: string | null;
  ai_prompt_versao: string | null;
  ai_json: Record<string, unknown> | null;
  mensagem_hash: string | null;
  duplicado: boolean;
}

export interface AIFollowupResult {
  mensagem_normalizada: string | null;
  lead_nome: string | null;
  lead_telefone: string | null;
  etapa_funil: EtapaFunil | null;
  status_lead: StatusLead | null;
  temperatura_lead: TemperaturaLead | null;
  resumo: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  responsavel_sugerido: string | null;
  campanha_nome: string | null;
  campaign_id: string | null;
  confianca: number | null;
  score_intencao: number | null;
}
