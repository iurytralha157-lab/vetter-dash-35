-- Função para criar notificação de menção
CREATE OR REPLACE FUNCTION public.create_mention_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_name TEXT;
  mentioned_user_id UUID;
  author_name TEXT;
BEGIN
  -- Buscar nome do autor
  SELECT name INTO author_name FROM profiles WHERE id = NEW.author_id;
  
  -- Extrair menções do conteúdo (@nome)
  FOR mentioned_name IN
    SELECT DISTINCT regexp_replace(match[1], '^\s+|\s+$', '', 'g') as name
    FROM regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+)', 'g') as match
  LOOP
    -- Buscar usuário mencionado pelo nome
    SELECT id INTO mentioned_user_id 
    FROM profiles 
    WHERE LOWER(name) = LOWER(TRIM(mentioned_name))
    LIMIT 1;
    
    -- Criar notificação se encontrou o usuário e não é o próprio autor
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        mentioned_user_id,
        'mention',
        'Nova menção',
        COALESCE(author_name, 'Alguém') || ' mencionou você em um post',
        NEW.id,
        'community_post'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para posts
DROP TRIGGER IF EXISTS on_post_mention ON community_posts;
CREATE TRIGGER on_post_mention
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- Função para menções em comentários
CREATE OR REPLACE FUNCTION public.create_comment_mention_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_name TEXT;
  mentioned_user_id UUID;
  author_name TEXT;
BEGIN
  -- Buscar nome do autor
  SELECT name INTO author_name FROM profiles WHERE id = NEW.author_id;
  
  -- Extrair menções do conteúdo (@nome)
  FOR mentioned_name IN
    SELECT DISTINCT regexp_replace(match[1], '^\s+|\s+$', '', 'g') as name
    FROM regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+)', 'g') as match
  LOOP
    -- Buscar usuário mencionado pelo nome
    SELECT id INTO mentioned_user_id 
    FROM profiles 
    WHERE LOWER(name) = LOWER(TRIM(mentioned_name))
    LIMIT 1;
    
    -- Criar notificação se encontrou o usuário e não é o próprio autor
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        mentioned_user_id,
        'mention',
        'Nova menção',
        COALESCE(author_name, 'Alguém') || ' mencionou você em um comentário',
        NEW.post_id,
        'community_post'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para comentários
DROP TRIGGER IF EXISTS on_comment_mention ON community_comments;
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_mention_notification();