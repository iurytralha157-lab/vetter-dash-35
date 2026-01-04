import React, { useState, useEffect } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Usuário real
  const [profileName, setProfileName] = useState<string>("Usuário");
  const [profileEmail, setProfileEmail] = useState<string>("");

  // Notificações reais (Supabase)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Sync sidebar collapsed state
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

  // Buscar nome real do usuário no profiles
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.id) return;

        setProfileEmail(user?.email || "");

        const { data, error } = await supabase
          .from("profiles")
          .select("name, email")
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
      } catch (err) {
        console.warn("Falha ao carregar profile:", err);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Buscar notificações reais do Supabase (performance_alerts)
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);

        // Pega alertas ativos mais recentes
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
          hidden lg:flex items-center justify-between h-16 bg-card border-b border-border
          transition-all duration-500 ease-in-out fixed top-0 right-0 z-30
          ${sidebarCollapsed ? "left-16" : "left-64"}
        `}
        style={{
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        {/* Left Section - (REMOVIDO título da página) */}
        <div />

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications - agora real */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-muted transition-all duration-200 hover:scale-105"
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

            <DropdownMenuContent align="end" className="w-96 shadow-xl">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} ativa{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {notificationsLoading ? (
                  <div className="p-4 text-sm text-text-secondary">
                    Carregando notificações...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-sm text-text-secondary">
                    Nenhuma notificação ativa no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start p-4 gap-1 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {n.title}
                          </span>
                          <p className="text-xs text-text-tertiary mt-1">
                            {n.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">{n.time}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-center text-primary cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  // se você tiver uma rota tipo /alertas, manda pra lá
                  // navigate("/alertas")
                }}
              >
                Ver todos os alertas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu - nome real */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 hover:bg-muted transition-all duration-200"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {profileName}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {profileEmail ? profileEmail : "Conta"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 shadow-xl">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-muted/50">Perfil</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-muted/50">
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive hover:bg-destructive/10">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile TopBar */}
      <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-card border-b border-border">
        {/* Left - só drawer (REMOVIDO título da página) */}
        <div className="flex items-center gap-3">
          <MobileDrawer />
        </div>

        {/* Right - notifications + user */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
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
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationsLoading ? (
                <div className="p-3 text-sm text-text-secondary">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-3 text-sm text-text-secondary">Sem alertas ativos.</div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start p-3 gap-1"
                  >
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-text-secondary">{n.time}</div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{profileName}</p>
                  <p className="text-[11px] text-text-secondary">Conta</p>
                </div>
                <ChevronDown className="h-4 w-4 text-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
