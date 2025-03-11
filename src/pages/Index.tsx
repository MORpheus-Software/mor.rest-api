
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronRight, Key, LockKeyhole, Shield, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const features = [
    {
      title: 'Secure Token Management',
      description: 'Create, activate, deactivate, and delete API tokens with ease. Full control over who has access to your API.',
      icon: Key,
    },
    {
      title: 'Fine-grained Permissions',
      description: 'Set precise permissions for each token, controlling exactly what actions they can perform.',
      icon: LockKeyhole,
    },
    {
      title: 'Usage Analytics',
      description: 'Track when and how your tokens are being used with detailed request logs and usage statistics.',
      icon: Shield,
    },
    {
      title: 'Interactive API Playground',
      description: 'Test your API endpoints directly from the dashboard with our built-in API playground.',
      icon: Code,
    },
  ];

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-apple-ease py-4 px-6",
        scrollY > 10 ? "bg-white/80 backdrop-blur-lg shadow-sm" : "bg-transparent"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
            <span>TokenHub</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild>
                <Link to="/dashboard">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-4xl text-center space-y-6 animate-fade-in">
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4 animate-slide-in">
            Simple and secure API token management
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
            Secure Access to Your API with Powerful Token Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Create, manage, and monitor API tokens with our easy-to-use dashboard. Keep your API secure while giving access to those who need it.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="#">
                View Documentation
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="w-full max-w-4xl mt-16 rounded-xl overflow-hidden shadow-xl animate-scale-in opacity-90 hover:opacity-100 transition-opacity">
          <img 
            src="https://via.placeholder.com/1200x600/f5f5f5/cccccc?text=API+Token+Dashboard" 
            alt="API Token Dashboard Preview" 
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
              Everything You Need for API Token Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform provides all the tools you need to securely manage access to your API.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card p-6 rounded-xl shadow-subtle hover-scale"
              >
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Button size="lg" asChild>
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                Start Managing Your Tokens
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 font-medium mb-4 md:mb-0">
              <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
              <span>TokenHub</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TokenHub. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
