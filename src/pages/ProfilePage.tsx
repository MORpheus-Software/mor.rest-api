import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserProfile {
  email: string;
  name: string;
  company: string;
  joinedDate: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    email: '',
    name: '',
    company: '',
    joinedDate: '',
  });

  useEffect(() => {
    // Get user data from localStorage
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    
    if (user) {
      // Use actual user data from localStorage
      const userProfile: UserProfile = {
        email: user.email || '',
        name: user.name || '',
        company: user.company || '',
        joinedDate: user.createdAt || new Date().toISOString().split('T')[0],
      };
      
      setProfile(userProfile);
      setFormData(userProfile);
    } else {
      // Fallback to mock data if no user found
      const mockProfile: UserProfile = {
        email: 'user@example.com',
        name: 'John Doe',
        company: 'Acme Inc.',
        joinedDate: new Date().toISOString().split('T')[0],
      };
      
      setProfile(mockProfile);
      setFormData(mockProfile);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Save to profile state
    setProfile(formData);
    setIsEditing(false);
    
    // Get current user data
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      
      // Update with new profile data
      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        company: formData.company
      };
      
      // Save back to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    toast.success('Profile updated successfully');
  };

  const handleDeleteAccount = () => {
    // In a real app, this would call an API
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    
    // Redirect to home page
    window.location.href = '/';
    
    toast.success('Account deleted successfully');
  };

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">View and update your account information</p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  value={isEditing ? formData.email : profile.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={isEditing ? formData.name : profile.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={isEditing ? formData.company : profile.company}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="joinedDate">Member Since</Label>
                <Input
                  id="joinedDate"
                  value={new Date(profile.joinedDate).toLocaleDateString()}
                  disabled
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData(profile);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </CardFooter>
        </Card>
        
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </CardContent>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
