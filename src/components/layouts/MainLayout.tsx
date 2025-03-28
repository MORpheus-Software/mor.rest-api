import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export function MainLayout({ children, hideNavigation = false }: MainLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Check if user is authenticated
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(!!auth);

    // Add scroll listener
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-apple-ease py-4 px-6", scrollY > 10 ? "bg-white/80 backdrop-blur-lg shadow-sm" : "bg-transparent")}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
            <span>MOR.rest API</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>
          
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs">
              <nav className="flex flex-col space-y-4 mt-8">
                <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </Link>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                
                <div className="border-t border-border mt-4 pt-4">
                  {isAuthenticated ? (
                    <Button asChild className="w-full mt-2">
                      <Link to="/playground">
                        Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" asChild className="w-full">
                        <Link to="/signin">Sign In</Link>
                      </Button>
                      <Button asChild className="w-full">
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? <Button asChild>
                <Link to="/playground">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button> : <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>}
          </div>
        </div>
      </header>

      {/* Main Content with top padding for the header */}
      <main className="flex-1 pt-16">
        {children}
      </main>
    </div>
  );
} 