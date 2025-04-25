import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './TokensTable';
import { isAuthenticated, getAuthToken } from '@/lib/auth';
import { Copy } from 'lucide-react';

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateToken: (token: { name: string }) => void;
}

export function CreateTokenDialog({ open, onOpenChange, onCreateToken }: CreateTokenDialogProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please provide a name for your API key');
      return;
    }
    
    // Clear any previous errors and created key
    setError(null);
    setCreatedKey(null);
    setIsCreating(true);
    
    try {
      // Check authentication status before submitting
      if (!isAuthenticated(true)) {
        console.error('[CREATE TOKEN] User not authenticated');
        setError('Authentication error - please sign in again');
        setIsCreating(false);
        return;
      }
      
      // Check if auth token exists
      const authToken = getAuthToken(true);
      if (!authToken) {
        console.error('[CREATE TOKEN] No auth token available');
        setError('Authentication token missing - please sign in again');
        setIsCreating(false);
        return;
      }
      
      // Create new token with custom event handling
      const handleTokenCreation = (e: CustomEvent) => {
        const newToken = e.detail?.token;
        if (newToken && newToken.token && newToken.token.startsWith('sk-')) {
          console.log('[CREATE TOKEN] Received token from creation event');
          setCreatedKey(newToken.token);
        }
        window.removeEventListener('tokenCreated' as any, handleTokenCreation);
      };
      
      // Add event listener for token creation
      window.addEventListener('tokenCreated' as any, handleTokenCreation);
      
      // Pass only the name to the parent component
      // The API key generation now happens server-side
      onCreateToken({ name: name.trim() });
      
      // Reset form name but keep dialog open to show the key
      setName('');
    } catch (error) {
      console.error('[CREATE TOKEN] Error creating token:', error);
      setError('Failed to create API key: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (keyInputRef.current && createdKey) {
      keyInputRef.current.select();
      document.execCommand('copy');
      // Alternatively for modern browsers:
      navigator.clipboard.writeText(createdKey).catch(err => {
        console.error('Could not copy text: ', err);
      });
      
      // Flash the input to show it was copied
      keyInputRef.current.classList.add('bg-green-50');
      setTimeout(() => {
        if (keyInputRef.current) {
          keyInputRef.current.classList.remove('bg-green-50');
        }
      }, 300);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Reset form when dialog is closed
    if (!open) {
      setName('');
      setError(null);
      setCreatedKey(null);
      setIsCreating(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? 'API Key Created' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {createdKey 
              ? 'Your API key has been created. Copy it now, you won\'t be able to see it again.'
              : 'Generate a new API key for authentication with our API'
            }
          </DialogDescription>
        </DialogHeader>
        
        {!createdKey ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g. Production API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Give your API key a descriptive name to identify its purpose
              </p>
            </div>
            
            {error && (
              <div className="px-3 py-2 text-sm bg-red-100 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Key'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Your API Key</Label>
              <div className="flex">
                <Input
                  ref={keyInputRef}
                  id="api-key"
                  value={createdKey}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-[59px] h-8 w-8"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-amber-600 font-semibold">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={copyToClipboard}
              >
                Copy to Clipboard
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
