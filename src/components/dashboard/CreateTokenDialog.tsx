import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './TokensTable';

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateToken: (token: { name: string }) => void;
}

export function CreateTokenDialog({ open, onOpenChange, onCreateToken }: CreateTokenDialogProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Pass only the name to the parent component
      // The API key generation now happens server-side
      onCreateToken({ name: name.trim() });
      
      // Reset form
      setName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Reset form when dialog is closed
    if (!open) {
      setName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for authentication with our API
          </DialogDescription>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
}
