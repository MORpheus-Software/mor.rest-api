
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

type CreateTokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateToken: (token: any) => void;
};

export function CreateTokenDialog({ open, onOpenChange, onCreateToken }: CreateTokenDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'created'>('form');
  const [loading, setLoading] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    
    setLoading(true);
    
    try {
      // Generate a token
      const newToken = `tk_${uuidv4().replace(/-/g, '')}`;
      setGeneratedToken(newToken);
      
      // Create token object
      const token = {
        id: uuidv4(),
        name: tokenName,
        token: newToken,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsed: null
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onCreateToken(token);
      setStep('created');
    } catch (error) {
      toast({
        title: "Error creating token",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Token copied to clipboard",
      description: "Make sure to store it securely, as it won't be shown again",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset the dialog state after it's closed
    setTimeout(() => {
      setStep('form');
      setTokenName('');
      setGeneratedToken('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New API Token</DialogTitle>
              <DialogDescription>
                Generate a new token to access the API. This token will have full access to your account.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Token Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Production Server"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Give your token a descriptive name to help you identify it later.
                </p>
              </div>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!tokenName.trim() || loading}>
                  {loading ? "Creating..." : "Generate Token"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                This token will only be displayed once. Please copy it and store it securely.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-md bg-muted/50 border border-muted">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-muted-foreground">Your API Token</Label>
                  <Button size="sm" variant="ghost" onClick={handleCopyToken} className="h-8">
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Copy
                  </Button>
                </div>
                <code className="block w-full p-2 rounded bg-background/80 text-sm break-all">
                  {generatedToken}
                </code>
              </div>
              
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-sm">
                <p className="font-medium">Important Security Notice</p>
                <p className="text-xs mt-1">
                  You won't be able to see this token again. If you lose it, you'll need to generate a new one.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Add uuid dependency
<lov-add-dependency>uuid@latest</lov-add-dependency>

// Add @types/uuid dependency for TypeScript
<lov-add-dependency>@types/uuid@latest</lov-add-dependency>
