
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight,
  LayoutDashboard, 
  Key, 
  PlayCircle, 
  User,
  LogOut
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
};

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    icon: Key,
    label: 'API Tokens',
    href: '/tokens',
  },
  {
    icon: PlayCircle,
    label: 'Playground',
    href: '/playground',
  },
  {
    icon: User,
    label: 'Profile',
    href: '/profile',
  },
];

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // On mobile, always start collapsed
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div 
      className={cn(
        "h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-apple-ease relative",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link 
          to="/dashboard" 
          className={cn(
            "flex items-center gap-2 font-medium",
            collapsed && "justify-center"
          )}
        >
          <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
          {!collapsed && <span>TokenHub</span>}
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center text-sidebar-foreground rounded-md py-2 px-3 text-sm font-medium hover:bg-sidebar-accent transition-colors",
                location.pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-muted-foreground hover:text-destructive",
              collapsed && "w-full justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground",
              collapsed && "hidden md:flex"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <button
        className="md:hidden absolute -right-3 top-20 bg-primary text-white rounded-full p-1 shadow-md"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  );
}
