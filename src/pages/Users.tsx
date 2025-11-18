import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  Target,
  MessageSquare,
  FileText,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  logoSrc?: string;
  logoCollapsedSrc?: string;
  brandName?: string;
}

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "gestor", "usuario"],
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Building2,
    roles: ["admin", "gestor"],
  },
  {
    title: "Contas",
    url: "/contas",
    icon: Receipt,
    roles: ["admin", "gestor"],
  },
  {
    title: "Campanhas",
    url: "/campanhas",
    icon: Target,
    roles: ["admin", "gestor", "usuario"],
  },
  {
    title: "Leads",
    url: "/leads",
    icon: MessageSquare,
    roles: ["admin", "gestor", "usuario"],
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: FileText,
    roles: ["admin", "gestor"],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    roles: ["admin", "gestor"],
  },
];

export function AppSidebar({
  logoSrc = "/Logo-branca.webp",
  logoCollapsedSrc = "/logo-mark.svg",
  brandName = "Vetter Co.",
}: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [userRole, setUserRole] = useState<string>("usuario");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;

  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Buscar perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

      // Buscar role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name || "");
        setUserEmail(profile.email || user.email || "");
      }

      if (roleData) {
        setUserRole(roleData.role || "usuario");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

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

  // Filtrar itens de navegação por role
  const filteredNavItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const getUserInitials = () => {
    if (userName) {
      return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userEmail.slice(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside className={`
        hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border
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

        {/* Header com Logo */}
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
                  
                  {active && (
                    <div className="absolute right-3 w-2 h-2 bg-white/80 rounded-full animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer com User Info */}
        <div className={`
          border-t border-sidebar-border bg-sidebar-accent/30
          transition-all duration-500 ease-in-out
          ${isCollapsed ? 'p-2' : 'p-4'}
        `}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
                    <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <div className="text-sm">
                    <p className="font-medium">{userName || "Usuário"}</p>
                    <p className="text-muted-foreground">{userEmail}</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Sair
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {userName || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                  asChild
                >
                  <NavLink to="/configuracoes">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Configurações</span>
                  </NavLink>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
