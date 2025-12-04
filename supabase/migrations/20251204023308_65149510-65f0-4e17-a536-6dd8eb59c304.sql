-- Add time tracking columns to demandas
ALTER TABLE public.demandas
ADD COLUMN hora_entrega time DEFAULT NULL,
ADD COLUMN em_andamento_at timestamp with time zone DEFAULT NULL,
ADD COLUMN em_andamento_por uuid REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN concluido_at timestamp with time zone DEFAULT NULL,
ADD COLUMN concluido_por uuid REFERENCES auth.users(id) DEFAULT NULL;

-- Create history table for tracking all status changes
CREATE TABLE public.demanda_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  alterado_por uuid REFERENCES auth.users(id),
  alterado_em timestamp with time zone NOT NULL DEFAULT now(),
  observacao text
);

-- Enable RLS on history table
ALTER TABLE public.demanda_historico ENABLE ROW LEVEL SECURITY;

-- RLS policies for history
CREATE POLICY "Authenticated users can view demanda history"
  ON public.demanda_historico
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert demanda history"
  ON public.demanda_historico
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_demanda_historico_demanda_id ON public.demanda_historico(demanda_id);
CREATE INDEX idx_demanda_historico_alterado_em ON public.demanda_historico(alterado_em DESC);