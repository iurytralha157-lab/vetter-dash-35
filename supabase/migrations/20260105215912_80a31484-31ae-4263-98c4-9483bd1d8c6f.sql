-- Atualizar posts existentes para visibilidade pública
UPDATE community_posts 
SET visibility = 'public' 
WHERE visibility = 'org' OR visibility IS NULL;