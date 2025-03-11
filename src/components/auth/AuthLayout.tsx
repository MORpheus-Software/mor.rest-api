
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthLayout({
  children,
  title,
  description,
  footer,
  className
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center animate-blur-in py-10 px-4 md:px-8">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-lg font-medium hover:opacity-80 transition-opacity">
        <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
        <span>TokenHub</span>
      </Link>
      
      <div className={cn(
        "w-full max-w-md glass-card rounded-xl px-8 py-10 md:px-10 md:py-12 animate-scale-in",
        className
      )}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        
        {children}
      </div>
      
      {footer && (
        <div className="mt-6 text-center text-sm text-muted-foreground animate-fade-in animation-delay-200">
          {footer}
        </div>
      )}
    </div>
  );
}
