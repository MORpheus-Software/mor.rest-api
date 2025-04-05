import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, Key, Play, User, BookOpen, Menu, Coins, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { logout } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Sidebar() {
  const location = useLocation();
  const [isMobileView, setIsMobileView] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const navItems = [
    {
      title: 'API Keys',
      href: '/tokens',
      icon: Key,
    },
    {
      title: 'API Playground',
      href: '/playground',
      icon: Play,
    },
    {
      title: 'Staking',
      href: '/staking',
      icon: Coins,
    },
    {
      title: 'Documents',
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
    toast.success('Logged out successfully');
    logout();
  };

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

  // Desktop sidebar content
  const desktopSidebarContent = (
    <>
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link to="/playground" className="flex items-center gap-2 font-semibold">
          <img src="https://www.mor.software/logo.svg" alt="MOR.rest" className="h-8 w-8" />
          <span>MOR.rest API</span>
        </Link>
      </div>
      <div className="flex flex-col gap-1 p-4 flex-1">
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
        <div className="flex-1"></div>
        <Button
          variant="ghost"
          className="mt-2 justify-start gap-3 px-3 text-sm text-muted-foreground hover:bg-transparent hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Log out
        </Button>
      </div>
    </>
  );

  // Mobile sidebar content (no logo/title)
  const mobileSidebarContent = (
    <div className="flex flex-col h-full pt-4">
      <div className="flex flex-col gap-1 p-4 flex-1">
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
            onClick={() => setIsOpen(false)}
          >
            <item.icon size={18} />
            {item.title}
          </Link>
        ))}
        <div className="flex-1"></div>
        <Button
          variant="ghost"
          className="mt-2 justify-start gap-3 px-3 text-sm text-muted-foreground hover:bg-transparent hover:text-destructive"
          onClick={() => {
            handleLogout();
            setIsOpen(false);
          }}
        >
          <LogOut size={18} />
          Log out
        </Button>
      </div>
    </div>
  );

  // For desktop, render the sidebar directly
  if (!isMobileView) {
    return (
      <div className="min-h-screen w-64 border-r border-border bg-card">
        {desktopSidebarContent}
      </div>
    );
  }

  // For mobile, render the hamburger menu in a fixed top bar
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border px-4 flex items-center shadow-sm">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu size={20} />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {mobileSidebarContent}
        </SheetContent>
      </Sheet>
      
      <div className="flex items-center justify-center flex-1">
        <Link to="/playground" className="flex items-center gap-2 font-semibold">
          <img src="https://www.mor.software/logo.svg" alt="MOR.rest" className="h-8 w-8" />
          <span>MOR.rest API</span>
        </Link>
      </div>
    </div>
  );
}
