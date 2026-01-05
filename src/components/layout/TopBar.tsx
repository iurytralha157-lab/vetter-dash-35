import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { MobileDrawer } from "./MobileDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: "low" | "medium" | "high" | "critical" | string;
};

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const [profileName, setProfileName] = useState<string>("Usuário");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("sidebar-collapsed");
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.id) return;

        setProfileEmail(user?.email || "");

        const { data, error } = await supabase
          .from("profiles")
          .select("name, email, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Erro ao buscar profile:", error);
        }

        const fallbackName =
          (user?.user_metadata?.full_name as string) ||
          (user?.user_metadata?.name as string) ||
          "Usuário";

        setProfileName(data?.name?.trim() || fallbackName);
        setProfileEmail(data?.email || user?.email || "");
        setAvatarUrl(data?.avatar_url || null);
      } catch (err) {
        console.warn("Falha ao carregar profile:", err);
      }
    };

    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);

        const { data, error } = await supabase
          .from("performance_alerts")
          .select("id, title, message, severity, created_at, status")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.warn("Erro ao buscar notificações:", error);
          setNotifications([]);
          return;
        }

        const mapped: NotificationItem[] = (data || []).map((n: any) => ({
          id: n.id,
          title: n.title || "Alerta",
          description: n.message || "",
          severity: n.severity || "info",
          time: new Date(n.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setNotifications(mapped);
      } catch (err) {
        console.warn("Falha ao carregar notificações:", err);
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const unreadCount = notifications.length;

  return (
    <>
      {/* Desktop TopBar */}
      <header
        className={`
          hidden lg:flex items-center justify-between h-16 bg-dark-900 border-b border-border/50
          transition-all duration-500 ease-in-out fixed top-0 right-0 z-30
          ${sidebarCollapsed ? "left-16" : "left-64"}
        `}
        style={{
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div />

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-dark-700 transition-all duration-200 hover:scale-105"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 shadow-xl bg-dark-800 border-border/50">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
                    {unreadCount} ativa{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />

              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {notificationsLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Carregando notificações...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Nenhuma notificação ativa no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start p-4 gap-1 hover:bg-dark-700 transition-colors"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {n.title}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {n.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{n.time}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>

              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="text-center text-primary cursor-pointer hover:bg-primary/10"
                onClick={() => {}}
              >
                Ver todos os alertas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 hover:bg-dark-700 transition-all duration-200"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {profileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profileEmail ? profileEmail : "Conta"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 shadow-xl bg-dark-800 border-border/50">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-dark-700" onClick={() => navigate('/configuracoes')}>
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-dark-700" onClick={() => navigate('/configuracoes')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile TopBar */}
      <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-dark-900 border-b border-border/50">
        <div className="flex items-center gap-3">
          <MobileDrawer />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-dark-700">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-dark-800 border-border/50">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              {notificationsLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Sem alertas ativos.</div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start p-3 gap-1 hover:bg-dark-700"
                  >
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.time}</div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-dark-700">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {profileName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground max-w-[80px] truncate">
                  {profileName}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl bg-dark-800 border-border/50">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-dark-700" onClick={() => navigate('/configuracoes')}>
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-dark-700" onClick={() => navigate('/configuracoes')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
