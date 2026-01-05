-- Adicionar coluna para tamanho da logo em pixels
ALTER TABLE public.system_branding 
ADD COLUMN logo_size INTEGER DEFAULT 40;