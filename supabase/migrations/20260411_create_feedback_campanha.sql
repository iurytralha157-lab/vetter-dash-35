-- New table for campaign-level feedback data (does NOT alter existing tables)
CREATE TABLE IF NOT EXISTS public.feedback_campanha (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  account_id uuid REFERENCES public.accounts(id),
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  tipo_funil text NOT NULL CHECK (tipo_funil IN ('lancamento', 'terceiros')),
  campanha_nome text NOT NULL,
  campanha_codigo_curto text,
  quantidade_recebida integer NOT NULL DEFAULT 0,
  quantidade_descartado integer NOT NULL DEFAULT 0,
  quantidade_aguardando_retorno integer NOT NULL DEFAULT 0,
  quantidade_atendimento integer NOT NULL DEFAULT 0,
  quantidade_passou_corretor integer NOT NULL DEFAULT 0,
  quantidade_visita integer NOT NULL DEFAULT 0,
  quantidade_proposta integer NOT NULL DEFAULT 0,
  quantidade_venda integer NOT NULL DEFAULT 0,
  mensagem_original text NOT NULL,
  mensagem_hash text,
  ai_json jsonb,
  ai_modelo text,
  processamento_status text DEFAULT 'pendente',
  processamento_erro text,
  id_grupo text,
  numero_grupo text,
  telefone_origem text,
  nome_origem text,
  usuario_origem text
);

-- RLS
ALTER TABLE public.feedback_campanha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on feedback_campanha"
  ON public.feedback_campanha FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor view feedback_campanha"
  ON public.feedback_campanha FOR SELECT
  TO authenticated
  USING (
    is_gestor(auth.uid()) AND account_id IN (
      SELECT id FROM accounts WHERE gestor_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER update_feedback_campanha_updated_at
  BEFORE UPDATE ON public.feedback_campanha
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_funnel_updated_at();
