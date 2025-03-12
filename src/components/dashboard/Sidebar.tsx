
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, Key, Play, User, Coins, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'API Tokens',
      href: '/tokens',
      icon: Key,
    },
    {
      title: 'API Playground',
      href: '/playground',
      icon: Play,
    },
    {
      title: 'MOR Staking',
      href: '/staking',
      icon: Coins,
    },
    {
      title: 'Documentation',
      href: '/docs',
      icon: BookOpen,
    },
    {
      title: 'Profile',
      href: '/profile',
      icon: User,
    },
  ];

  const handleLogout = () => {
    // Remove authentication state
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    
    toast.success('Logged out successfully');
    
    // Redirect to home page
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 font-medium">
          <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
          <span className="text-sidebar-foreground">TokenHub</span>
        </Link>
      </div>
      
      <div className="flex-1 py-2 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              location.pathname === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </div>
      
      <div className="p-6 mt-auto">
        <Button
          variant="outline"
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
