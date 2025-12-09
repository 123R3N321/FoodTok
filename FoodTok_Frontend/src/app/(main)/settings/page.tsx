/**
 * Settings Page
 * User account settings, preferences, and app configuration
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight,
  Edit,
  Save,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updatePreferences } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [editedUser, setEditedUser] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/api/auth/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: editedUser.firstName,
          lastName: editedUser.lastName,
          email: editedUser.email
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save profile' }));
        throw new Error(error.error || 'Failed to save profile');
      }

      const data = await response.json();
      
      // Update local auth store
      useAuthStore.setState((state) => ({
        user: state.user ? { 
          ...state.user, 
          firstName: editedUser.firstName,
          lastName: editedUser.lastName,
          email: editedUser.email
        } : null
      }));
      
      setIsEditing(false);
      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Failed to save profile:', error);
      setError(error.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:8080/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to change password' }));
        throw new Error(error.error || 'Failed to change password');
      }
      
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const settingSections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Edit Profile', action: () => setIsEditing(true) },
        { label: 'Change Password', action: () => setIsChangingPassword(true) }
      ]
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Logged In</h1>
          <p className="text-muted-foreground mb-4">Please log in to access settings</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Profile Information
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditing(true);
                    setError('');
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      First Name
                    </label>
                    <Input
                      value={editedUser.firstName}
                      onChange={(e) => setEditedUser(prev => ({ 
                        ...prev, 
                        firstName: e.target.value 
                      }))}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Last Name
                    </label>
                    <Input
                      value={editedUser.lastName}
                      onChange={(e) => setEditedUser(prev => ({ 
                        ...prev, 
                        lastName: e.target.value 
                      }))}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser(prev => ({ 
                      ...prev, 
                      email: e.target.value 
                    }))}
                    placeholder="Email address"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        {isChangingPassword && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Change Password
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                  {passwordSuccess}
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      currentPassword: e.target.value 
                    }))}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      newPassword: e.target.value 
                    }))}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ 
                      ...prev, 
                      confirmPassword: e.target.value 
                    }))}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Updating...' : 'Change Password'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError('');
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        )}

        {/* Food Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Food Preferences</CardTitle>
            <CardDescription>
              Customize your restaurant recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Favorite Cuisines</h4>
                <div className="flex flex-wrap gap-2">
                  {user.preferences?.cuisineTypes && user.preferences.cuisineTypes.length > 0 ? (
                    user.preferences.cuisineTypes.map((cuisine) => (
                      <span
                        key={cuisine}
                        className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm"
                      >
                        {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No cuisines selected</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Price Range</h4>
                <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                  {user.preferences?.priceRange || 'Not set'}
                </span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.push('/onboarding')}
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              >
                Update Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Sections */}
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.action}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>About FoodTok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Version 1.0.0</p>
              <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
              <p>© 2025 NYU Software Engineering Project</p>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}