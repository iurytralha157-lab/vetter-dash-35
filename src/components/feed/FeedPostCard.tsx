import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Heart, MessageCircle, Send, Pin, MoreVertical, Trash2, AlertTriangle, Megaphone } from "lucide-react";
import { communityService, CommunityPost, CommunityComment } from "@/services/communityService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PollDisplay } from "./PollDisplay";
import { RenderContentWithMentions } from "./RenderContentWithMentions";

interface FeedPostCardProps {
  post: CommunityPost & { poll_options?: string[] | null; post_category?: string };
  onUpdate: () => void;
  onViewProfile: (userId: string) => void;
}

export function FeedPostCard({ post, onUpdate, onViewProfile }: FeedPostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const getCategoryBadge = () => {
    switch (post.post_category) {
      case 'aviso':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-3 w-3" />
            Aviso
          </Badge>
        );
      case 'campanha':
        return (
          <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-500 bg-blue-500/10">
            <Megaphone className="h-3 w-3" />
            Campanha
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mb-4 overflow-hidden border-border/50 hover:border-border transition-colors">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onViewProfile(post.author_id)}
          >
            <Avatar className="h-10 w-10 ring-2 ring-background group-hover:ring-primary/50 transition-all">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                {post.author?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">
                {post.author?.name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getCategoryBadge()}
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
        <div className="px-4 pb-3">
          <p className="text-foreground whitespace-pre-wrap">
            <RenderContentWithMentions 
              content={post.content} 
              onMentionClick={(username) => {
                // Buscar usuário pelo nome e abrir perfil
                // Por enquanto apenas destaca visualmente
              }}
            />
          </p>
        </div>

        {/* Media - Full Width Instagram Style */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="relative">
            {post.media_urls.length === 1 ? (
              // Single media - full width
              (() => {
                const url = post.media_urls[0];
                const lowerUrl = url.toLowerCase();
                const isVideo = lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('.mkv');
                
                return isVideo ? (
                  <video 
                    src={url} 
                    controls
                    className="w-full max-h-[600px] object-contain bg-black"
                    playsInline
                  />
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <img 
                        src={url} 
                        alt="Mídia" 
                        className="w-full max-h-[600px] object-contain bg-black cursor-pointer hover:opacity-95 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).alt = 'Erro ao carregar imagem';
                        }}
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
                      <img 
                        src={url} 
                        alt="Mídia" 
                        className="w-full h-auto rounded-lg"
                      />
                    </DialogContent>
                  </Dialog>
                );
              })()
            ) : (
              // Multiple media - grid
              <div className="grid grid-cols-2 gap-0.5">
                {post.media_urls.map((url, i) => {
                  const lowerUrl = url.toLowerCase();
                  const isVideo = lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('.mkv');
                  return isVideo ? (
                    <video 
                      key={i} 
                      src={url} 
                      controls
                      playsInline
                      className="w-full aspect-square object-cover bg-black"
                    />
                  ) : (
                    <Dialog key={i}>
                      <DialogTrigger asChild>
                        <img 
                          src={url} 
                          alt="Mídia" 
                          className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).alt = 'Erro ao carregar';
                          }}
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
                        <img 
                          src={url} 
                          alt="Mídia" 
                          className="w-full h-auto rounded-lg"
                        />
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Poll */}
        {post.post_type === 'poll' && post.poll_options && (
          <div className="px-4">
            <PollDisplay 
              postId={post.id} 
              options={post.poll_options}
              onVote={onUpdate}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-4 py-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`gap-1.5 ${post.user_has_liked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className={`h-5 w-5 ${post.user_has_liked ? "fill-current" : ""}`} />
            <span className="font-medium">{post.likes_count}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadComments}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">{post.comments_count}</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="px-4 pb-4 border-t border-border/50">
            <div className="pt-3 space-y-3">
              {loadingComments ? (
                <p className="text-sm text-muted-foreground text-center py-2">Carregando...</p>
              ) : (
                <>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar 
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => onViewProfile(comment.author_id)}
                      >
                        <AvatarImage src={comment.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2">
                        <p 
                          className="text-sm font-medium cursor-pointer hover:text-primary"
                          onClick={() => onViewProfile(comment.author_id)}
                        >
                          {comment.author?.name}
                        </p>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* New Comment */}
                  <div className="flex gap-2 pt-2">
                    <Textarea
                      placeholder="Escreva um comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[40px] max-h-[100px] resize-none"
                      rows={1}
                    />
                    <Button 
                      size="icon" 
                      onClick={handleComment} 
                      disabled={!newComment.trim()}
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
