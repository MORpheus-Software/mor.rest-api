import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Check if we're in mobile view
  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);

    return () => {
      window.removeEventListener('resize', checkScreenWidth);
    };
  }, []);
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Always render Sidebar - it will adapt to mobile/desktop internally */}
      <Sidebar />
      
      {/* Main content area */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-background",
        isMobileView ? "pt-16 w-full" : ""
      )}>
        <div className={cn(
          "animate-fade-in py-6",
          isMobileView ? "px-4" : "container max-w-6xl"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
