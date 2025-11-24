-- Tabela para registrar os checks diários das contas
CREATE TABLE IF NOT EXISTS public.daily_account_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_meta BOOLEAN DEFAULT FALSE,
  checked_google BOOLEAN DEFAULT FALSE,
  meta_checked_by UUID REFERENCES auth.users(id),
  meta_checked_at TIMESTAMP WITH TIME ZONE,
  google_checked_by UUID REFERENCES auth.users(id),
  google_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, check_date)
);

-- Índices para melhor performance
CREATE INDEX idx_daily_checks_account_date ON public.daily_account_checks(account_id, check_date);
CREATE INDEX idx_daily_checks_date ON public.daily_account_checks(check_date);

-- RLS Policies
ALTER TABLE public.daily_account_checks ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver todos os checks
CREATE POLICY "Authenticated users can view daily checks"
  ON public.daily_account_checks
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem inserir checks
CREATE POLICY "Authenticated users can insert daily checks"
  ON public.daily_account_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários autenticados podem atualizar checks
CREATE POLICY "Authenticated users can update daily checks"
  ON public.daily_account_checks
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_daily_account_checks_updated_at
  BEFORE UPDATE ON public.daily_account_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.daily_account_checks IS 'Registra os checks diários de verificação das contas Meta e Google';
COMMENT ON COLUMN public.daily_account_checks.check_date IS 'Data do check (diário)';
COMMENT ON COLUMN public.daily_account_checks.checked_meta IS 'Se a conta Meta foi verificada neste dia';
COMMENT ON COLUMN public.daily_account_checks.checked_google IS 'Se a conta Google foi verificada neste dia';