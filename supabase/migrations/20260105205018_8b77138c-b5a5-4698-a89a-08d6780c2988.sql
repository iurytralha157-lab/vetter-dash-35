-- Tabela para branding global do sistema
CREATE TABLE public.system_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  name TEXT DEFAULT 'MetaFlow',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.system_branding (name) VALUES ('MetaFlow');

-- Habilitar RLS
ALTER TABLE public.system_branding ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para tela de login)
CREATE POLICY "Public can view system branding" 
ON public.system_branding 
FOR SELECT 
USING (true);

-- Apenas admins podem editar
CREATE POLICY "Admins can manage system branding" 
ON public.system_branding 
FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));