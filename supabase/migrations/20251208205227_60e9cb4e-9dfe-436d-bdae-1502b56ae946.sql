-- Tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  enabled boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver configurações
CREATE POLICY "Admins can view system settings"
ON public.system_settings
FOR SELECT
USING (is_admin(auth.uid()));

-- Apenas admins podem inserir configurações
CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Apenas admins podem atualizar configurações
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (is_admin(auth.uid()));

-- Apenas admins podem deletar configurações
CREATE POLICY "Admins can delete system settings"
ON public.system_settings
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão de webhooks
INSERT INTO public.system_settings (key, value, enabled, description) VALUES
('webhook_demandas_url', '', true, 'URL do webhook para notificações de demandas'),
('webhook_demandas_criada', '', true, 'Notificar quando demanda for criada'),
('webhook_demandas_concluida', '', true, 'Notificar quando demanda for concluída'),
('webhook_checklist_url', '', true, 'URL do webhook para checklist diário'),
('webhook_checklist_lembrete_manha', '', true, 'Enviar lembrete às 8h'),
('webhook_checklist_relatorio_tarde', '', true, 'Enviar relatório às 17h'),
('webhook_clientes_url', '', true, 'URL do webhook para novos clientes'),
('webhook_clientes_novo_cadastro', '', true, 'Notificar quando novo cliente se cadastrar'),
('organizacao_nome', 'MetaFlow', true, 'Nome da organização');