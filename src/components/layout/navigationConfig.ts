import { 
  LayoutDashboard, 
  Users, 
  Building2,
  LineChart, 
  Blocks, 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  MessageSquare,
  Webhook,
  Kanban,
  Settings,
  UserCheck
} from "lucide-react";
import { pt } from "@/i18n/pt";
import { UserRole } from "@/hooks/useUserRole";

export interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  roles?: UserRole[]; // Se vazio/undefined, todos podem acessar
}

export const navigationItems: NavigationItem[] = [
  { title: pt.nav.dashboard, url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Contas", url: "/contas", icon: Building2 },
  { title: "Demandas", url: "/demandas", icon: Kanban },
  { title: pt.nav.training, url: "/capacitacao", icon: GraduationCap, roles: ['admin'] },
  { title: pt.nav.users, url: "/usuarios", icon: ShieldCheck, roles: ['admin'] },
  { title: "Aprovações", url: "/admin/aprovacoes", icon: UserCheck, roles: ['admin'] },
  { title: pt.nav.reportN8n, url: "/relatorio-n8n", icon: Webhook, roles: ['admin'] },
  { title: pt.settings.title, url: "/configuracoes", icon: Settings, roles: ['admin'] },
];

export const filterNavigationByRole = (items: NavigationItem[], userRole: UserRole | null): NavigationItem[] => {
  if (!userRole) return [];
  if (userRole === 'admin') return items; // Admin vê tudo
  
  return items.filter(item => {
    if (!item.roles || item.roles.length === 0) return true; // Item sem restrição
    return item.roles.includes(userRole);
  });
};