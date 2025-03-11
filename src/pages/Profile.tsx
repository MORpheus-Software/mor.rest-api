
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { UserProfile } from '@/components/dashboard/UserProfile';

const ProfilePage = () => {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>
      
      <UserProfile />
    </DashboardLayout>
  );
};

export default ProfilePage;
