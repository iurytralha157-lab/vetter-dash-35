-- Corrigir search_path nas funções criadas
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Habilitar RLS nas tabelas que faltaram
ALTER TABLE public.campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpl_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para campaign_history
CREATE POLICY "Users can view campaign history"
ON public.campaign_history FOR SELECT
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE POLICY "System can insert campaign history"
ON public.campaign_history FOR INSERT
WITH CHECK (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

-- Políticas para cpl_settings
CREATE POLICY "Users can view cpl settings"
ON public.cpl_settings FOR SELECT
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE POLICY "Admins can manage cpl settings"
ON public.cpl_settings FOR ALL
USING (public.is_vetter_admin(auth.uid()));