-- Criar tabela de demandas
CREATE TABLE public.demandas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  gestor_responsavel_id uuid REFERENCES public.profiles(id),
  criado_por uuid REFERENCES auth.users(id),
  orcamento numeric,
  link_criativos text,
  data_entrega date,
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view demandas"
ON public.demandas FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create demandas"
ON public.demandas FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update demandas"
ON public.demandas FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete demandas"
ON public.demandas FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();