-- Corrigir search_path das funções de notificação
CREATE OR REPLACE FUNCTION notify_new_post()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, type, title, message, reference_id, reference_type)
  SELECT 
    p.id,
    'post',
    'Nova publicação no VFeed',
    SUBSTRING(NEW.content FROM 1 FOR 100),
    NEW.id,
    'community_post'
  FROM public.profiles p
  WHERE p.id != NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_new_demanda()
RETURNS TRIGGER AS $$
DECLARE
  conta_nome TEXT;
BEGIN
  SELECT nome_cliente INTO conta_nome FROM public.accounts WHERE id = NEW.account_id;
  
  IF NEW.gestor_responsavel_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.gestor_responsavel_id,
      'demanda_designada',
      'Nova demanda designada',
      COALESCE(NEW.titulo, 'Sem título') || ' - ' || COALESCE(conta_nome, 'Cliente'),
      NEW.id,
      'demanda'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;