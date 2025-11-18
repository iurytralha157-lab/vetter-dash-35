import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  Target,
  MessageSquare,
  FileText,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>("usuario");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Menu items
  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "usuario"] },
    { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"] },
    { title: "Clientes", url: "/clientes", icon: Building2, roles: ["admin", "gestor"] },
    { title: "Contas", url: "/contas", icon: Receipt, roles: ["admin", "gestor"] },
    { title: "Campanhas", url: "/campanhas", icon: Target, roles: ["admin", "gestor", "usuario"] },
    { title: "Leads", url: "/leads", icon: MessageSquare, roles: ["admin", "gestor", "usuario"] },
    { title: "Relatórios", url: "/relatorios", icon: FileText, roles: ["admin", "gestor"] },
    { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["admin", "gestor"] },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const getUserInitials = () => {
    if (userName) {
      return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userEmail.slice(0, 2).toUpperCase();
  };

  return (
    <aside className={`
      hidden lg:flex flex-col h-screen bg-[#0a0a0a] border-r border-gray-800
      transition-all duration-300 fixed left-0 top-0 z-40
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-50 h-6 w-6 rounded-full 
          bg-gray-900 border border-gray-700 hover:bg-gray-800
          flex items-center justify-center text-gray-400 hover:text-white"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo */}
      <div className={`
        flex items-center border-b border-gray-800 p-4
        ${isCollapsed ? 'justify-center' : ''}
      `}>
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {!isCollapsed && (
          <span className="ml-3 font-bold text-lg text-white">
            Vetter Co.
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {filteredMenuItems.map((item) => {
            const active = isActive(item.url);
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.title}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className={`
        border-t border-gray-800 p-4
        ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}
      `}>
        {isCollapsed ? (
          <>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {getUserInitials()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="h-10 w-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName || "Usuário"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
