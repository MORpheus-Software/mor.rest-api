import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ApiPlayground } from '@/components/dashboard/ApiPlayground';
import { useToast } from '@/hooks/use-toast';

const PlaygroundPage = () => {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if token is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      toast({
        title: "Token loaded",
        description: "You can now test API requests with this token",
      });
    }
  }, [toast]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">API Playground</h1>
        <p className="text-muted-foreground">Test your API keys and endpoints interactively</p>
      </div>
      
      <ApiPlayground />
    </DashboardLayout>
  );
};

export default PlaygroundPage;
