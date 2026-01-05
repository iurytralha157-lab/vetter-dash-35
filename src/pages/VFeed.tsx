import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Send, Pin, MoreVertical, Trash2 } from "lucide-react";
import { communityService, CommunityPost, CommunityComment } from "@/services/communityService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PostCard({ post, onUpdate }: { post: CommunityPost; onUpdate: () => void }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const data = await communityService.getComments(post.id);
        setComments(data);
      } catch (error) {
        console.error('Erro ao carregar comentários:', error);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleLike = async () => {
    try {
      await communityService.toggleLike(post.id);
      onUpdate();
    } catch (error) {
      toast.error('Erro ao curtir');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await communityService.addComment(post.id, newComment);
      setComments([...comments, comment]);
      setNewComment("");
      onUpdate();
    } catch (error) {
      toast.error('Erro ao comentar');
    }
  };

  const handleDelete = async () => {
    try {
      await communityService.deletePost(post.id);
      toast.success('Post excluído');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const isAuthor = user?.id === post.author_id;

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback>
                {post.author?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.author?.name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.is_pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="h-3 w-3" />
                Fixado
              </Badge>
            )}
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.media_urls.map((url, i) => (
              <img 
                key={i} 
                src={url} 
                alt="Mídia" 
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={post.user_has_liked ? "text-red-500" : ""}
          >
            <Heart className={`h-4 w-4 mr-1 ${post.user_has_liked ? "fill-current" : ""}`} />
            {post.likes_count}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadComments}>
            <MessageCircle className="h-4 w-4 mr-1" />
            {post.comments_count}
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted rounded-lg p-2">
                      <p className="text-sm font-medium">{comment.author?.name}</p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {/* New Comment */}
                <div className="flex gap-2 mt-3">
                  <Textarea
                    placeholder="Escreva um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button size="icon" onClick={handleComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VFeed() {
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => communityService.getPosts()
  });

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    setIsPosting(true);
    try {
      await communityService.createPost(newPost);
      setNewPost("");
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post publicado!');
    } catch (error) {
      toast.error('Erro ao publicar');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">VFeed</h1>
          <p className="text-muted-foreground">Comunidade e atualizações</p>
        </div>

        {/* Create Post */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <Textarea
              placeholder="O que você quer compartilhar?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px] mb-3"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleCreatePost} 
                disabled={!newPost.trim() || isPosting}
              >
                {isPosting ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* Posts Feed */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando posts...</p>
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['community-posts'] })}
            />
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum post ainda. Seja o primeiro a compartilhar!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
