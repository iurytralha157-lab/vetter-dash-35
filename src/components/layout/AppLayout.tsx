import { ReactNode, useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { BottomNavigation } from "./BottomNavigation";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Escutar mudanças no estado da sidebar
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar-collapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Fixa no lado esquerdo (desktop) */}
      <AppSidebar />
      
      {/* TopBar - apenas mobile (contém MobileDrawer e notificações) */}
      <div className="lg:hidden">
        <TopBar />
      </div>
      
      {/* Main Content - Ajustado dinamicamente */}
      <main 
        className={`
          transition-all duration-500 ease-in-out min-h-screen
          lg:pt-0 pt-0
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="h-full overflow-y-auto scrollbar-thin">
          <div className="px-3 pt-1 pb-2 sm:px-4 sm:pt-4 sm:pb-4 lg:px-6 lg:pt-6 lg:pb-6 min-h-full">
            <div className="max-w-screen-2xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      {/* Bottom Navigation - apenas mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNavigation />
      </div>
    </div>
  );
}