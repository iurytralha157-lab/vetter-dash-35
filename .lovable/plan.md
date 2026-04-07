## Plano de Remoção - VFeed e VAcademy

### 1. Arquivos a DELETAR

**VFeed - Páginas e Componentes:**
- `src/pages/VFeed.tsx`
- `src/components/feed/FeedPostCard.tsx`
- `src/components/feed/FeedSearchFilter.tsx`
- `src/components/feed/MentionInput.tsx`
- `src/components/feed/PollCreator.tsx`
- `src/components/feed/PollDisplay.tsx`
- `src/components/feed/PostTypeSelector.tsx`
- `src/components/feed/RenderContentWithMentions.tsx`
- `src/components/feed/UserProfileSheet.tsx`
- `src/components/feed/VideoPlayer.tsx`
- `src/services/communityService.ts`

**VAcademy - Páginas e Componentes:**
- `src/pages/VAcademy.tsx`
- `src/pages/CourseDetail.tsx`
- `src/pages/CourseEditor.tsx`
- `src/pages/Training.tsx`
- `src/pages/TrainingDetail.tsx`
- `src/pages/AddTraining.tsx`
- `src/components/courses/SecureVideoPlayer.tsx`
- `src/services/coursesService.ts`
- `src/mocks/trainingService.ts`

### 2. Arquivos a EDITAR

- **`src/App.tsx`** - Remover imports e rotas do VFeed, VAcademy, Training, CourseDetail, CourseEditor
- **`src/components/layout/navigationConfig.ts`** - Remover itens "VFeed" e "VAcademy" da navegação
- **`src/components/layout/BottomNavigation.tsx`** - Remover item "VFeed" da barra inferior mobile

### 3. Banco de Dados - Tabelas a DROPAR (via migration)

**VFeed:**
- `community_posts`
- `community_comments`
- `community_likes`
- `community_poll_votes`

**VAcademy:**
- `courses`
- `course_modules`
- `course_lessons`

**Storage bucket:**
- `community-media`
- `course-media`

### 4. Edge Functions relacionadas
- Nenhuma edge function específica do VFeed/VAcademy identificada (apenas `notify_new_post` trigger no banco)

### 5. Triggers/Functions do banco a remover
- `notify_new_post()` (trigger de notificação de posts)
- `update_post_comments_count()` 
- `update_post_likes_count()`
- `create_mention_notification()`
- `create_comment_mention_notification()`

### ⚠️ Cuidados
- Não afetar o sistema de notificações geral (`user_notifications` continua existindo)
- Não afetar autenticação, dashboard, demandas, contas ou configurações
- Remover imports não utilizados para evitar erros de build
