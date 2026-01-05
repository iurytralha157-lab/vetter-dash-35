-- Adicionar coluna para favicon (ícone pequeno quando sidebar recolhida)
ALTER TABLE public.system_branding 
ADD COLUMN favicon_url TEXT;