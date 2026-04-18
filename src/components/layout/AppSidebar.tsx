import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  User,
  Settings as SettingsIcon,
  Bell,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { navigationItems, filterNavigationByRole } from "./navigationConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { useSystemBranding } from "@/hooks/useSystemBranding";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  logoSrc?: string;
  logoCollapsedSrc?: string;
  brandName?: string;
}

export function AppSidebar({
  logoSrc = "/Logo-branca.webp",
  logoCollapsedSrc = "/logo-mark.svg",
  brandName = "Vetter Co.",
}: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const profileCache = (() => {
    try {
      const raw = localStorage.getItem('user-profile-cache');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [userName, setUserName] = useState<string | null>(profileCache?.userName ?? null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(profileCache?.userAvatarUrl ?? null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(profileCache?.orgLogoUrl ?? null);
  const [orgName, setOrgName] = useState<string | null>(profileCache?.orgName ?? null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { logoUrl: systemLogoUrl, faviconUrl: systemFaviconUrl, name: systemName, logoSize: systemLogoSize } = useSystemBranding();
  const { notifications, unreadCount, loading: notificationsLoading, markAllAsRead, navigateToNotification } = useNotifications();

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post': return '📢';
      case 'demanda_designada': return '📋';
      case 'demanda_nova': return '🆕';
      case 'demanda_status': return '🔄';
      default: return '🔔';
    }
  };
  const currentPath = location.pathname;
  const filteredNavItems = filterNavigationByRole(navigationItems, role);
  
  // Determine which logo and name to use (org > system > default)
  const displayLogoUrl = orgLogoUrl || systemLogoUrl;
  const displayFaviconUrl = systemFaviconUrl;
  const displayName = orgName || systemName || brandName;
  const displayLogoSize = systemLogoSize || 40;

  // Buscar dados do perfil e organização (atualiza cache em background)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url, organization_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.name);
        setUserAvatarUrl(profile.avatar_url);

        let nextOrgName: string | null = null;
        let nextOrgLogo: string | null = null;

        if (profile.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name, sidebar_logo_url')
            .eq('id', profile.organization_id)
            .single();

          if (org) {
            nextOrgName = org.name;
            nextOrgLogo = org.sidebar_logo_url;
            setOrgName(org.name);
            setOrgLogoUrl(org.sidebar_logo_url);
          }
        }

        try {
          localStorage.setItem(
            'user-profile-cache',
            JSON.stringify({
              userId: user.id,
              userName: profile.name,
              userAvatarUrl: profile.avatar_url,
              orgName: nextOrgName,
              orgLogoUrl: nextOrgLogo,
            })
          );
        } catch {
          // ignore storage errors
        }
      }
    };

    fetchUserData();
  }, [user?.id]);

  // Salvar estado no localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard" || currentPath === "/boards";
    }
    return currentPath.startsWith(path);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside className={`
        hidden lg:flex flex-col h-screen bg-dark-900 border-r border-border/50
        transition-all duration-500 ease-in-out fixed left-0 top-0 z-40
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={`
            absolute -right-3 top-8 z-50 h-6 w-6 rounded-full 
            bg-dark-800 border border-border/50 shadow-lg
            hover:shadow-xl transition-all duration-300
            text-foreground hover:bg-dark-700 hover:border-primary/30
            hover:scale-110
          `}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        <div className="flex items-center justify-center border-b border-border/50 py-4">
          <NavLink to="/" className="flex items-center justify-center group w-full">
            <div className="flex items-center justify-center flex-shrink-0">
              {isCollapsed ? (
                // Sidebar recolhida - usa favicon ou logo reduzida
                displayFaviconUrl ? (
                  <img 
                    src={displayFaviconUrl} 
                    alt="Favicon" 
                    className="object-contain"
                    style={{ width: 32, height: 32 }}
                  />
                ) : displayLogoUrl ? (
                  <img 
                    src={displayLogoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{ width: 32, height: 32 }}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-primary">
                    <span className="text-white font-bold text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )
              ) : (
                // Sidebar expandida - usa logo principal
                displayLogoUrl ? (
                  <img 
                    src={displayLogoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{ height: displayLogoSize }}
                  />
                ) : (
                  <div 
                    className="rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-primary"
                    style={{ width: displayLogoSize, height: displayLogoSize }}
                  >
                    <span 
                      className="text-white font-bold"
                      style={{ fontSize: displayLogoSize * 0.4 }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )
              )}
            </div>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-6">
          <div className={`space-y-2 transition-all duration-500 ${isCollapsed ? 'px-2' : 'px-3'}`}>

            {filteredNavItems.map((item) => {
              const active = isActive(item.url);
              
              if (isCollapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.url}
                        className={`
                          flex items-center justify-center h-12 w-12 mx-auto rounded-xl
                          transition-all duration-300 ease-out group relative
                          ${active 
                            ? 'bg-primary/10 text-primary border-l-2 border-primary glow-primary' 
                            : 'text-muted-foreground hover:bg-dark-700 hover:text-foreground hover:scale-105'
                          }
                        `}
                      >
                        <item.icon className="h-5 w-5" />
                        {active && (
                          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="font-medium shadow-lg border-border/50 bg-dark-800"
                      sideOffset={12}
                    >
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-300 ease-out group relative overflow-hidden
                    ${active
                      ? 'bg-primary/10 text-primary border-l-2 border-primary glow-primary'
                      : 'text-muted-foreground hover:bg-dark-700 hover:text-foreground hover:scale-[1.02]'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`
                    font-medium truncate transition-all duration-500
                    ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
                  `}>
                    {item.title}
                  </span>
                  
                  {active && (
                    <div className="absolute right-3 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer com Notificações + User Info (Dropdown: Perfil, Configurações, Sair) */}
        <div className={`
          border-t border-border/50 bg-dark-800/50
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}
        `}>
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative w-12 h-12 mx-auto rounded-xl hover:bg-dark-700 hover:scale-105 transition-all duration-200"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute top-1.5 right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              ) : (
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 hover:bg-dark-700 transition-colors duration-200 text-left"
                >
                  <div className="relative">
                    <Bell className="h-5 w-5 text-foreground" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">Notificações</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {unreadCount > 0
                        ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                        : 'Nenhuma nova'}
                    </div>
                  </div>
                </button>
              )}
            </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? 'right' : 'top'}
                align={isCollapsed ? 'start' : 'end'}
                sideOffset={12}
                className="w-96 shadow-xl bg-dark-800 border-border/50"
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notificações</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary hover:text-primary/80"
                      onClick={(e) => {
                        e.preventDefault();
                        markAllAsRead();
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar todas como lidas
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {notificationsLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Nenhuma notificação no momento.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={`flex flex-col items-start p-4 gap-1 hover:bg-dark-700 cursor-pointer ${
                          !n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => navigateToNotification(n)}
                      >
                        <div className="flex items-start justify-between w-full gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-lg">{getNotificationIcon(n.type)}</span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-foreground`}>
                                {n.title}
                              </span>
                              {n.message && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {n.message}
                                </p>
                              )}
                            </div>
                          </div>
                          {!n.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground ml-7">
                          {formatNotificationTime(n.created_at)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 mx-auto rounded-xl hover:bg-dark-700 hover:scale-105 transition-all duration-200"
                >
                  <Avatar className="h-9 w-9 border-2 border-border/50">
                    <AvatarImage src={userAvatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-bold">
                      {userName?.charAt(0).toUpperCase() ||
                       user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              ) : (
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors duration-200 text-left"
                >
                  <Avatar className="h-10 w-10 border-2 border-border/50">
                    <AvatarImage src={userAvatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-bold">
                      {userName?.charAt(0).toUpperCase() ||
                       user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {userName || 'Usuário'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                  </div>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'start' : 'center'}
              sideOffset={12}
              className="w-56 shadow-xl bg-dark-800 border-border/50"
            >
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-dark-700 cursor-pointer" onClick={() => navigate('/configuracoes')}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-dark-700 cursor-pointer" onClick={() => navigate('/configuracoes')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
