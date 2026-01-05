import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Image, Video, X, Loader2, MessageCircle } from "lucide-react";
import { communityService, CommunityPost } from "@/services/communityService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostTypeSelector, PostCategory } from "@/components/feed/PostTypeSelector";
import { PollCreator } from "@/components/feed/PollCreator";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { UserProfileSheet } from "@/components/feed/UserProfileSheet";
import { FeedSearchFilter, CategoryFilter } from "@/components/feed/FeedSearchFilter";
import { MentionInput, extractMentions } from "@/components/feed/MentionInput";

export default function VFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [postCategory, setPostCategory] = useState<PostCategory>('normal');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Buscar avatar do usuário
  useQuery({
    queryKey: ['user-avatar', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      setUserAvatarUrl(data?.avatar_url || null);
      return data?.avatar_url;
    },
    enabled: !!user?.id
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => communityService.getPosts()
  });

  // Filtrar posts baseado na pesquisa e categoria
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    
    return posts.filter((post: any) => {
      // Filtro de categoria
      if (categoryFilter !== 'all') {
        const postCategory = post.post_category || 'normal';
        if (postCategory !== categoryFilter) return false;
      }
      
      // Filtro de pesquisa
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const authorName = post.author?.name?.toLowerCase() || '';
        const content = post.content?.toLowerCase() || '';
        
        // Pesquisa por @autor
        if (query.startsWith('@')) {
          const authorQuery = query.slice(1);
          return authorName.includes(authorQuery);
        }
        
        // Pesquisa no conteúdo ou autor
        return content.includes(query) || authorName.includes(query);
      }
      
      return true;
    });
  }, [posts, searchQuery, categoryFilter]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (mediaFiles.length + files.length > 4) {
      toast.error('Máximo de 4 arquivos por post');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    const invalidFiles = files.filter(f => f.size > maxSize);
    if (invalidFiles.length > 0) {
      toast.error('Arquivo muito grande (máximo 50MB)');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (!user || mediaFiles.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of mediaFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('community-media')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        throw new Error('Erro ao fazer upload do arquivo');
      }

      const { data: urlData } = supabase.storage
        .from('community-media')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleCreatePost = async () => {
    // Validar enquete
    if (postCategory === 'enquete') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error('Adicione pelo menos 2 opções para a enquete');
        return;
      }
    }

    if (!newPost.trim() && mediaFiles.length === 0 && postCategory !== 'enquete') return;
    setIsPosting(true);
    setIsUploading(mediaFiles.length > 0);

    try {
      let mediaUrls: string[] = [];
      
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMedia();
      }

      const postType = postCategory === 'enquete' 
        ? 'poll' 
        : mediaFiles.some(f => f.type.startsWith('video/')) 
          ? 'video' 
          : mediaFiles.length > 0 
            ? 'image' 
            : 'text';

      // Criar post com poll_options e category
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();

      const { error } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUser.id,
          content: newPost,
          media_urls: mediaUrls,
          post_type: postType,
          post_category: postCategory,
          poll_options: postCategory === 'enquete' ? pollOptions.filter(o => o.trim()) : null,
          organization_id: profile?.organization_id,
          visibility: 'public'
        });

      if (error) throw error;

      setNewPost("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setPostCategory('normal');
      setPollOptions(['', '']);
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post publicado!');
    } catch (error) {
      console.error('Erro ao publicar:', error);
      toast.error('Erro ao publicar');
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setProfileSheetOpen(true);
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        {/* Header - mais compacto */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">VFeed</h1>
          <p className="text-muted-foreground text-sm">Comunidade e atualizações</p>
        </div>

        {/* Search and Filter */}
        <FeedSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />

        {/* Create Post - Mobile Responsive */}
        <Card className="mb-6 border-border/50">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Avatar - Hidden on mobile, visible on sm+ */}
              <Avatar className="h-10 w-10 shrink-0 hidden sm:flex">
                <AvatarImage src={userAvatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <MentionInput
                  placeholder={postCategory === 'enquete' ? 'Faça uma pergunta...' : 'O que você quer compartilhar?'}
                  value={newPost}
                  onChange={setNewPost}
                  minHeight="80px"
                />

                {/* Poll Creator */}
                {postCategory === 'enquete' && (
                  <PollCreator 
                    options={pollOptions}
                    onChange={setPollOptions}
                  />
                )}

                {/* Media Previews */}
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative group aspect-square">
                        {mediaFiles[index]?.type.startsWith('video/') ? (
                          <video 
                            src={preview} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={preview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'video')}
                />

                <Separator />

                {/* Actions - Responsive Layout */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <PostTypeSelector value={postCategory} onChange={setPostCategory} />
                    
                    {postCategory !== 'enquete' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-primary"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={mediaFiles.length >= 4}
                        >
                          <Image className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-primary"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={mediaFiles.length >= 4}
                        >
                          <Video className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={(!newPost.trim() && mediaFiles.length === 0 && postCategory !== 'enquete') || isPosting}
                    className="w-full sm:w-auto px-6"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : isPosting ? 'Publicando...' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post: any) => (
            <FeedPostCard 
              key={post.id} 
              post={post}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['community-posts'] })}
              onViewProfile={handleViewProfile}
            />
          ))
        ) : posts && posts.length > 0 ? (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum resultado encontrado para sua pesquisa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum post ainda. Seja o primeiro a compartilhar!
              </p>
            </CardContent>
          </Card>
        )}

        {/* User Profile Sheet */}
        <UserProfileSheet
          userId={selectedUserId}
          open={profileSheetOpen}
          onOpenChange={setProfileSheetOpen}
        />
      </div>
    </AppLayout>
  );
}
