import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './TokensTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
});

type FormValues = z.infer<typeof formSchema>;

type CreateTokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateToken: (token: Token) => void;
};

export function CreateTokenDialog({
  open,
  onOpenChange,
  onCreateToken,
}: CreateTokenDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsCreating(true);

    try {
      // Simulate API call to create a token
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a new token
      const tokenValue = `tk_${uuidv4().replace(/-/g, '')}`;
      setNewToken(tokenValue);

      // Create the token object
      const token: Token = {
        id: uuidv4(),
        name: values.name,
        token: tokenValue,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        lastUsed: null,
      };

      onCreateToken(token);
      
      // Reset the form but keep the dialog open to show the new token
      form.reset();
    } catch (error) {
      console.error('Error creating token:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseDialog = () => {
    onOpenChange(false);
    // Wait for dialog close animation before resetting state
    setTimeout(() => {
      setNewToken(null);
      form.reset();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {newToken ? 'Your New API Token' : 'Create API Token'}
          </DialogTitle>
        </DialogHeader>

        {newToken ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Your new API token has been created. Please save this token somewhere safe - you won't be able to see it again.
            </div>
            
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
              {newToken}
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newToken);
                }}
              >
                Copy to clipboard
              </Button>
              
              <Button onClick={handleCloseDialog}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Production API, Development Environment" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isCreating ? 'Creating...' : 'Create Token'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
