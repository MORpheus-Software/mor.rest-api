import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Authentication is now handled by AuthCheck and ProtectedRoute
  // No need for redundant checks here
  
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container py-6 animate-fade-in max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
