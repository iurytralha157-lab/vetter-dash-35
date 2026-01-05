import { supabase } from "@/integrations/supabase/client";

export interface CommunityPost {
  id: string;
  organization_id: string | null;
  author_id: string;
  content: string;
  media_urls: string[];
  post_type: 'text' | 'image' | 'video' | 'poll';
  visibility: 'public' | 'org' | 'private';
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export const communityService = {
  async getPosts(limit = 20): Promise<CommunityPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!posts) return [];

    // Buscar autores separadamente
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', authorIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]));

    // Verificar se o usuário curtiu cada post
    let likedPostIds = new Set<string>();
    if (user) {
      const postIds = posts.map(p => p.id);
      const { data: likes } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      likedPostIds = new Set(likes?.map(l => l.post_id));
    }

    return posts.map(post => ({
      ...post,
      post_type: post.post_type as CommunityPost['post_type'],
      visibility: post.visibility as CommunityPost['visibility'],
      author: profilesMap.get(post.author_id) || undefined,
      user_has_liked: likedPostIds.has(post.id)
    }));
  },

  async createPost(content: string, mediaUrls: string[] = [], postType: 'text' | 'image' | 'video' = 'text'): Promise<CommunityPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar organization_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        author_id: user.id,
        content,
        media_urls: mediaUrls,
        post_type: postType,
        organization_id: profile?.organization_id
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      post_type: data.post_type as CommunityPost['post_type'],
      visibility: data.visibility as CommunityPost['visibility']
    };
  },

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  },

  async toggleLike(postId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se já curtiu
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Remover like
      await supabase
        .from('community_likes')
        .delete()
        .eq('id', existingLike.id);
      return false;
    } else {
      // Adicionar like
      await supabase
        .from('community_likes')
        .insert({
          post_id: postId,
          user_id: user.id
        });
      return true;
    }
  },

  async getComments(postId: string): Promise<CommunityComment[]> {
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!comments) return [];

    // Buscar autores separadamente
    const authorIds = [...new Set(comments.map(c => c.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', authorIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]));

    return comments.map(comment => ({
      ...comment,
      author: profilesMap.get(comment.author_id) || undefined
    }));
  },

  async addComment(postId: string, content: string): Promise<CommunityComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }
};
