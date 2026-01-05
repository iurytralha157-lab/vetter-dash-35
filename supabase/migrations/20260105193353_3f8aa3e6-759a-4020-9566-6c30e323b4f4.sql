-- =============================================
-- FASE 2: LAYOUTS DINÂMICOS - Branding de Organização
-- =============================================

-- Adicionar campos de branding na organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#059669',
ADD COLUMN IF NOT EXISTS sidebar_logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Bem-vindo ao painel!';

-- =============================================
-- FASE 3: VFEED COMUNIDADE
-- =============================================

-- Posts da comunidade
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'poll')),
  visibility TEXT DEFAULT 'org' CHECK (visibility IN ('public', 'org', 'private')),
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- RLS para community_posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their org or public posts"
ON public.community_posts FOR SELECT
USING (
  visibility = 'public' 
  OR organization_id = public.get_user_org(auth.uid())
  OR public.is_vetter_admin(auth.uid())
);

CREATE POLICY "Users can create posts in their org"
ON public.community_posts FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (organization_id IS NULL OR organization_id = public.get_user_org(auth.uid()))
);

CREATE POLICY "Authors can update their posts"
ON public.community_posts FOR UPDATE
USING (author_id = auth.uid() OR public.is_vetter_admin(auth.uid()));

CREATE POLICY "Authors can delete their posts"
ON public.community_posts FOR DELETE
USING (author_id = auth.uid() OR public.is_vetter_admin(auth.uid()));

-- RLS para community_comments
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible posts"
ON public.community_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p 
    WHERE p.id = post_id 
    AND (p.visibility = 'public' OR p.organization_id = public.get_user_org(auth.uid()) OR public.is_vetter_admin(auth.uid()))
  )
);

CREATE POLICY "Users can create comments"
ON public.community_comments FOR INSERT
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their comments"
ON public.community_comments FOR DELETE
USING (author_id = auth.uid() OR public.is_vetter_admin(auth.uid()));

-- RLS para community_likes
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes"
ON public.community_likes FOR SELECT USING (true);

CREATE POLICY "Users can like posts"
ON public.community_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts"
ON public.community_likes FOR DELETE
USING (user_id = auth.uid());

-- Triggers para contadores
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.community_likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS on_comment_change ON public.community_comments;
CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- =============================================
-- FASE 4: VACADEMY CURSOS
-- =============================================

-- Cursos
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  instructor_id UUID REFERENCES auth.users(id),
  category TEXT,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_hours INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES public.organizations(id), -- NULL = curso global
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Módulos do curso
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Aulas
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content_html TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progresso do usuário
CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- RLS para courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published courses or their org courses"
ON public.courses FOR SELECT
USING (
  is_published = true 
  OR organization_id IS NULL 
  OR organization_id = public.get_user_org(auth.uid())
  OR public.is_vetter_admin(auth.uid())
);

CREATE POLICY "Admins can manage courses"
ON public.courses FOR ALL
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

-- RLS para course_modules
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view modules of accessible courses"
ON public.course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND (c.is_published = true OR c.organization_id IS NULL OR c.organization_id = public.get_user_org(auth.uid()) OR public.is_vetter_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can manage modules"
ON public.course_modules FOR ALL
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

-- RLS para course_lessons
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lessons of accessible modules"
ON public.course_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m 
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id 
    AND (c.is_published = true OR c.organization_id IS NULL OR c.organization_id = public.get_user_org(auth.uid()) OR public.is_vetter_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can manage lessons"
ON public.course_lessons FOR ALL
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

-- RLS para user_course_progress
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
ON public.user_course_progress FOR SELECT
USING (user_id = auth.uid() OR public.is_vetter_admin(auth.uid()));

CREATE POLICY "Users can track own progress"
ON public.user_course_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON public.user_course_progress FOR UPDATE
USING (user_id = auth.uid());

-- =============================================
-- FASE 5: DEMANDAS MELHORIAS
-- =============================================

-- Adicionar campos extras na demandas
ALTER TABLE public.demandas 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'tarefa',
ADD COLUMN IF NOT EXISTS urgencia BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT false;

-- Arquivos anexos às demandas
CREATE TABLE IF NOT EXISTS public.demanda_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id UUID REFERENCES public.demandas(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para demanda_arquivos
ALTER TABLE public.demanda_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files of accessible demandas"
ON public.demanda_arquivos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.demandas d WHERE d.id = demanda_id
  )
);

CREATE POLICY "Users can upload files"
ON public.demanda_arquivos FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete their files"
ON public.demanda_arquivos FOR DELETE
USING (uploaded_by = auth.uid() OR public.is_vetter_admin(auth.uid()));

-- =============================================
-- FASE 6: SMART CHECKLIST
-- =============================================

-- Health scores por conta
CREATE TABLE IF NOT EXISTS public.account_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  factors JSONB DEFAULT '{}', -- { "saldo": 80, "campanhas": 100, "leads": 60 }
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas automáticos
CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para account_health_scores
ALTER TABLE public.account_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health scores"
ON public.account_health_scores FOR SELECT
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE POLICY "System can insert health scores"
ON public.account_health_scores FOR INSERT
WITH CHECK (public.is_vetter_admin(auth.uid()));

-- RLS para smart_alerts
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts"
ON public.smart_alerts FOR SELECT
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE POLICY "Users can resolve alerts"
ON public.smart_alerts FOR UPDATE
USING (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE POLICY "System can create alerts"
ON public.smart_alerts FOR INSERT
WITH CHECK (public.is_vetter_admin(auth.uid()));

-- =============================================
-- STORAGE BUCKETS (políticas apenas, criação via dashboard)
-- =============================================

-- Inserir buckets se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('community-media', 'community-media', true),
  ('demanda-files', 'demanda-files', false),
  ('course-media', 'course-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para community-media
CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-media');

CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own community media"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para demanda-files
CREATE POLICY "Users can view demanda files"
ON storage.objects FOR SELECT
USING (bucket_id = 'demanda-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload demanda files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'demanda-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own demanda files"
ON storage.objects FOR DELETE
USING (bucket_id = 'demanda-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para course-media
CREATE POLICY "Anyone can view course media"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-media');

CREATE POLICY "Admins can upload course media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-media' AND (public.is_vetter_admin(auth.uid()) OR public.is_org_admin(auth.uid())));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_community_posts_org ON public.community_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_courses_org ON public.courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_account ON public.account_health_scores(account_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_account ON public.smart_alerts(account_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_unresolved ON public.smart_alerts(is_resolved) WHERE is_resolved = false;