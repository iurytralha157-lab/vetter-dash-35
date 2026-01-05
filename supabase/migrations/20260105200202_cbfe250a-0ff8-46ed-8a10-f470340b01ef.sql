-- Adicionar poll_options ao community_posts para suportar enquetes
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS poll_options jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS poll_expires_at timestamptz DEFAULT NULL;

-- Tabela para votos em enquetes
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies para poll votes
CREATE POLICY "Users can view poll votes" ON public.community_poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls" ON public.community_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote" ON public.community_poll_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their vote" ON public.community_poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Adicionar campos de edição ao community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS post_category text DEFAULT 'normal';

-- Criar bucket para avatars se não existir (para fotos de perfil)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para bucket avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Criar bucket para org-logos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para bucket org-logos
CREATE POLICY "Org logos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "Admins can upload org logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update org logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete org logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);