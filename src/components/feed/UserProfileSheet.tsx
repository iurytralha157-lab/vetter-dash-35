import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Mail, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  cargo: string | null;
  departamento: string | null;
  role: string | null;
}

interface UserPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface UserProfileSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileSheet({ userId, open, onOpenChange }: UserProfileSheetProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && open) {
      loadProfile();
      loadUserPosts();
    }
  }, [userId, open]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, cargo, departamento, role')
        .eq('id', userId)
        .single();

      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, content, media_urls, created_at, likes_count, comments_count')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gestor': return 'Gestor';
      case 'operador': return 'Operador';
      default: return 'Membro';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="text-left">
              <SheetTitle className="sr-only">Perfil do Usuário</SheetTitle>
            </SheetHeader>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Header do Perfil */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-white">
                      {profile.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-xl font-bold">{profile.name || 'Usuário'}</h2>
                  <Badge variant="secondary" className="mt-2">
                    {getRoleLabel(profile.role)}
                  </Badge>
                </div>

                {/* Informações */}
                <div className="space-y-3">
                  {profile.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile.cargo && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.cargo}</span>
                    </div>
                  )}
                  {profile.departamento && (
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.departamento}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Posts do usuário */}
                <div>
                  <h3 className="font-semibold mb-4">
                    Publicações ({posts.length})
                  </h3>
                  <div className="space-y-3">
                    {posts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma publicação ainda
                      </p>
                    ) : (
                      posts.map((post) => (
                        <Card key={post.id} className="overflow-hidden">
                          <CardContent className="p-3">
                            <p className="text-sm line-clamp-3">{post.content}</p>
                            {post.media_urls && post.media_urls.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {post.media_urls.slice(0, 4).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className="h-16 w-full object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{post.likes_count} curtidas</span>
                              <span>{post.comments_count} comentários</span>
                              <span>
                                {formatDistanceToNow(new Date(post.created_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Perfil não encontrado
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
