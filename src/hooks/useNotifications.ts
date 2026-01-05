import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Carregar notificações iniciais
  useEffect(() => {
    if (!user) return;
    
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Erro ao carregar notificações:', error);
        return;
      }
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      setLoading(false);
    };
    
    loadNotifications();
  }, [user]);

  // Escutar novas notificações em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast com ação
          toast(newNotification.title, {
            description: newNotification.message || undefined,
            action: {
              label: 'Ver',
              onClick: () => {
                if (newNotification.reference_type === 'community_post') {
                  navigate('/vfeed');
                } else if (newNotification.reference_type === 'demanda') {
                  navigate('/demandas');
                }
              }
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  // Marcar como lida
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return;
    }
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    if (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      return;
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Navegar para o item da notificação
  const navigateToNotification = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.reference_type === 'community_post') {
      navigate('/vfeed');
    } else if (notification.reference_type === 'demanda') {
      navigate('/demandas');
    }
  };

  return { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    navigateToNotification 
  };
}
