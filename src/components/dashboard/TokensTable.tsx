import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, MoreHorizontal, Trash, PlayCircle, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export type Token = {
  id: string;
  name: string;
  token: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastUsed: string | null;
};

type TokensTableProps = {
  tokens: Token[];
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (token: string) => void;
  onTest: (id: string) => void;
};

export function TokensTable({
  tokens,
  onActivate,
  onDeactivate,
  onDelete,
  onCopy,
  onTest
}: TokensTableProps) {
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleDelete = (id: string) => {
    setSelectedToken(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedToken) {
      onDelete(selectedToken);
      setIsDeleteDialogOpen(false);
      setSelectedToken(null);
    }
  };

  const handleCopy = (token: string) => {
    onCopy(token);
    toast({
      title: "API key copied to clipboard",
      description: "You can now use this key for API requests",
    });
  };

  return (
    <>
      <div className="rounded-lg border animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No API keys found. Create your first key to get started.
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((token) => (
                <TableRow 
                  key={token.id}
                  className="group transition-colors"
                  onMouseEnter={() => setHoveredRow(token.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                        {token.token.substring(0, 12)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(token.token)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={token.status === 'active' ? 'default' : 'outline'}
                      className={cn(
                        "capitalize",
                        token.status === 'active' ? "bg-green-500/20 text-green-700 hover:bg-green-500/20" : "text-muted-foreground",
                      )}
                    >
                      {token.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(token.createdAt)}</TableCell>
                  <TableCell>
                    {token.lastUsed ? formatDate(token.lastUsed) : 'Never used'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn(
                      "flex items-center justify-end space-x-1",
                      hoveredRow === token.id ? "opacity-100" : "opacity-0 md:opacity-100"
                    )}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onTest(token.id)}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      {token.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-500 hover:text-amber-600"
                          onClick={() => onDeactivate(token.id)}
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-500 hover:text-green-600"
                          onClick={() => onActivate(token.id)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() => handleDelete(token.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the API key and any applications using it will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
