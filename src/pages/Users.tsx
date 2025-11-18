import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const [userRole, setUserRole] = useState("usuario");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", userData.user.id)
        .single();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .single();

      if (profile) {
        setUserName(profile.name || "");
        setUserEmail(profile.email || userData.user.email || "");
      }

      if (roleData) {
        setUserRole(roleData.role || "usuario");
      }
    } catch (error) {
      console.error("Error:", error);
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
    item.roles.includes(userRole)
  );

  const getUserInitials = () => {
    if (userName) {
      const names = userName.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userEmail.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (url: string) => {
    navigate(url);
  };

  return (
    <aside 
      className="hidden lg:flex flex-col h-screen border-r fixed left-0 top-0 z-40 transition-all duration-300"
      style={{
        width: isCollapsed ? '64px' : '256px',
        backgroundColor: '#0a0a0a',
        borderColor: '#1f1f1f'
      }}
    >
      
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute z-50 flex items-center justify-center"
        style={{
          right: '-12px',
          top: '32px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          color: '#888'
        }}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div 
        className="flex items-center border-b p-4"
        style={{ 
          borderColor: '#1f1f1f',
          justifyContent: isCollapsed ? 'center' : 'flex-start'
        }}
      >
        <div 
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#2563eb'
          }}
        >
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>V</span>
        </div>
        {!isCollapsed && (
          <span style={{ 
            marginLeft: '12px', 
            fontWeight: 'bold', 
            fontSize: '18px', 
            color: 'white' 
          }}>
            Vetter Co.
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4" style={{ padding: isCollapsed ? '16px 8px' : '16px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredMenuItems.map((item) => {
            const active = isActive(item.url);
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.title}
                onClick={() => handleNavClick(item.url)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: active ? '#2563eb' : 'transparent',
                  color: active ? 'white' : '#9ca3af',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = '#1f1f1f';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#9ca3af';
                  }
                }}
                title={isCollapsed ? item.title : undefined}
              >
                <IconComponent size={20} style={{ flexShrink: 0 }} />
                {!isCollapsed && (
                  <span style={{ fontWeight: 500 }}>{item.title}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div 
        className="border-t p-4"
        style={{ 
          borderColor: '#1f1f1f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          gap: isCollapsed ? '8px' : '0'
        }}
      >
        {isCollapsed ? (
          <>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {getUserInitials()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                  {getUserInitials()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {userName || "Usuário"}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#9ca3af',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
