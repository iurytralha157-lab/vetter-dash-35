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
    // Persistir estado no localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const currentPath = location.pathname;
  const filteredNavItems = filterNavigationByRole(navigationItems, role);

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
        hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border
        transition-all duration-500 ease-in-out fixed left-0 top-0 z-40
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        
        {/* Toggle Button - Posicionamento refinado */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={`
            absolute -right-3 top-8 z-50 h-6 w-6 rounded-full 
            bg-sidebar border border-sidebar-border shadow-lg
            hover:shadow-xl transition-all duration-300
            text-sidebar-foreground hover:bg-sidebar-accent
            hover:scale-110
          `}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Header com Logo - Layout refinado */}
        <div className={`
          flex items-center border-b border-sidebar-border
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-3 justify-center min-h-[64px]' : 'p-4 min-h-[64px]'}
        `}>
          <NavLink to="/" className="flex items-center gap-3 group w-full">
            <div className="flex items-center justify-center flex-shrink-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            </div>
            
            {/* Texto que desaparece suavemente */}
            <div className={`
              flex flex-col overflow-hidden transition-all duration-500 ease-in-out
              ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
            `}>
              <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
                {brandName}
              </span>
            </div>
          </NavLink>
        </div>

        {/* Navigation Menu - SEM o label "Navegação" */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-6">
          <div className={`space-y-2 transition-all duration-500 ${isCollapsed ? 'px-2' : 'px-3'}`}>

            {filteredNavItems.map((item, index) => {
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
                            ? 'bg-gradient-primary text-white shadow-glow scale-105' 
                            : 'text-text-secondary hover:bg-sidebar-accent hover:text-sidebar-foreground hover:scale-105'
                          }
                        `}
                      >
                        <item.icon className="h-5 w-5" />
                        {active && (
                          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-full opacity-80" />
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="font-medium shadow-lg border-sidebar-border"
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
                      ? 'bg-gradient-primary text-white shadow-glow scale-[1.02]'
                      : 'text-text-secondary hover:bg-sidebar-accent hover:text-sidebar-foreground hover:scale-[1.02]'
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
                  
                  {/* Indicador visual para item ativo */}
                  {active && (
                    <div className="absolute right-3 w-2 h-2 bg-white/80 rounded-full animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer com User Info - Melhor transição */}
        <div className={`
          border-t border-sidebar-border bg-sidebar-accent/30
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-2' : 'p-4'}
        `}>
          {isCollapsed ? (
            <div className="space-y-3">
              {/* User Avatar - Collapsed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-10 w-10 border-2 border-sidebar-border hover:scale-105 transition-transform duration-200">
                      <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
                        {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 
                         user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <div className="text-sm">
                    <div className="font-medium">
                      {user?.user_metadata?.full_name || 'Usuário'}
                    </div>
                    <div className="text-text-tertiary text-xs">
                      {user?.email}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Logout Button - Collapsed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-10 h-10 mx-auto text-text-secondary hover:text-destructive hover:bg-destructive/10 hover:scale-105 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Sair do Sistema
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              {/* User Info - Expanded */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent/70 transition-colors duration-200">
                <Avatar className="h-10 w-10 border-2 border-sidebar-border">
                  <AvatarFallback className="bg-gradient-primary text-white text-sm font-bold">
                    {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 
                     user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className={`
                  flex-1 min-w-0 transition-all duration-500
                  ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
                `}>
                  <div className="text-sm font-semibold text-sidebar-foreground truncate">
                    {user?.user_metadata?.full_name || 'Usuário'}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons - Expanded */}
              <div className={`
                flex gap-2 transition-all duration-500
                ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex-1 justify-start gap-2 px-3 text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
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