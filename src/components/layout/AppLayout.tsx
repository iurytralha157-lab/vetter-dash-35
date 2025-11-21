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
      {/* Sidebar - Desktop only */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      {/* TopBar - Responsivo */}
      <TopBar />
      
      {/* Main Content - Responsivo */}
      <main 
        className={`
          transition-all duration-300 ease-in-out min-h-screen
          pt-16 pb-20 lg:pb-6
          lg:ml-64
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
      >
        <div className="h-full overflow-y-auto scrollbar-thin">
          <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 min-h-full">
            <div className="max-w-screen-2xl mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      {/* Bottom Navigation - Mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <BottomNavigation />
      </div>
    </div>
  );
}