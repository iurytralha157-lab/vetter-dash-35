-- Tabela de notificações do usuário
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON user_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON user_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Trigger para novos posts no VFeed
CREATE OR REPLACE FUNCTION notify_new_post()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  SELECT 
    p.id,
    'post',
    'Nova publicação no VFeed',
    SUBSTRING(NEW.content FROM 1 FOR 100),
    NEW.id,
    'community_post'
  FROM profiles p
  WHERE p.id != NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_community_post
AFTER INSERT ON community_posts
FOR EACH ROW
EXECUTE FUNCTION notify_new_post();

-- Trigger para novas demandas
CREATE OR REPLACE FUNCTION notify_new_demanda()
RETURNS TRIGGER AS $$
DECLARE
  conta_nome TEXT;
BEGIN
  SELECT nome_cliente INTO conta_nome FROM accounts WHERE id = NEW.account_id;
  
  IF NEW.gestor_responsavel_id IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_demanda
AFTER INSERT ON demandas
FOR EACH ROW
EXECUTE FUNCTION notify_new_demanda();