import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, Kanban, Rss } from "lucide-react";
import { MobileDrawer } from "./MobileDrawer";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface BottomNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const bottomNavItems: BottomNavItem[] = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "Contas", 
    url: "/contas", 
    icon: Building2 
  },
  { 
    title: "Demandas", 
    url: "/demandas", 
    icon: Kanban 
  },
  { 
    title: "VFeed", 
    url: "/vfeed", 
    icon: Rss 
  },
];

export function BottomNavigation() {
  const location = useLocation();
  const { role } = useUserRole();

  // Filtrar itens por role
  const filteredItems = bottomNavItems.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!role) return false;
    if (role === 'admin') return true;
    return item.roles.includes(role);
  });

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "/boards";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="grid grid-cols-5 h-16">
        {filteredItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`
                flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors
                ${active 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span className="text-xs font-medium truncate">
                {item.title}
              </span>
            </NavLink>
          );
        })}
        
        {/* More menu item */}
        <div className="flex flex-col items-center justify-center gap-1 px-1 py-2">
          <MobileDrawer />
          <span className="text-xs font-medium text-muted-foreground">
            Mais
          </span>
        </div>
      </div>
    </nav>
  );
}