import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { navigationItems, filterNavigationByRole } from "./navigationConfig";
import { useUserRole } from "@/hooks/useUserRole";
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
  const [userName, setUserName] = useState<string | null>(null);
  
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const currentPath = location.pathname;
  const filteredNavItems = filterNavigationByRole(navigationItems, role);

  // Buscar nome real do usuário do perfil
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (data?.name) {
        setUserName(data.name);
      }
    };
    
    fetchUserName();
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

        {/* Header com Logo */}
        <div className={`
          flex items-center border-b border-border/50
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-3 justify-center min-h-[64px]' : 'p-4 min-h-[64px]'}
        `}>
          <NavLink to="/" className="flex items-center gap-3 group w-full">
            <div className="flex items-center justify-center flex-shrink-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-primary">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            </div>
            
            <div className={`
              flex flex-col overflow-hidden transition-all duration-500 ease-in-out
              ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
            `}>
              <span className="font-bold text-lg text-foreground whitespace-nowrap">
                {brandName}
              </span>
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

        {/* Footer com User Info */}
        <div className={`
          border-t border-border/50 bg-dark-800/50
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-2' : 'p-4'}
        `}>
          {isCollapsed ? (
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-10 w-10 border-2 border-border/50 hover:scale-105 transition-transform duration-200 hover:border-primary/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-bold">
                        {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 
                         user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-dark-800 border-border/50">
                  <div className="text-sm">
                    <div className="font-medium">
                      {userName || user?.user_metadata?.full_name || 'Usuário'}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {user?.email}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-10 h-10 mx-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:scale-105 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-dark-800 border-border/50">
                  Sair do Sistema
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors duration-200">
                <Avatar className="h-10 w-10 border-2 border-border/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-bold">
                    {userName?.charAt(0).toUpperCase() || 
                     user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className={`
                  flex-1 min-w-0 transition-all duration-500
                  ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
                `}>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {userName || 'Usuário'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
              
              <div className={`
                flex gap-2 transition-all duration-500
                ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex-1 justify-start gap-2 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
