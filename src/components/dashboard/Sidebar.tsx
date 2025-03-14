import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, Key, Play, User, Coins, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { logout } from '@/lib/auth';

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
    // Hidden for development
    // {
    //   title: 'MOR Staking',
    //   href: '/staking',
    //   icon: Coins,
    // },
    // {
    //   title: 'Documentation',
    //   href: '/docs',
    //   icon: BookOpen,
    // },
    {
      title: 'Profile',
      href: '/profile',
      icon: User,
    },
  ];

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
  };

  return (
    <div className="min-h-screen w-64 border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
          <span>TokenHub</span>
        </Link>
      </div>
      <div className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted',
              location.pathname === item.href
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <item.icon size={18} />
            {item.title}
          </Link>
        ))}
        <Button
          variant="ghost"
          className="mt-2 justify-start gap-3 px-3 text-sm text-muted-foreground hover:bg-transparent hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Log out
        </Button>
      </div>
    </div>
  );
}
