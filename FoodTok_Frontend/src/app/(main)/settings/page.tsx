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
  const [editedUser, setEditedUser] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: editedUser.firstName,
          lastName: editedUser.lastName
        })
      });

      if (!response.ok) throw new Error('Failed to save profile');

      const data = await response.json();
      
      // Update local auth store
      useAuthStore.setState((state) => ({
        user: state.user ? { 
          ...state.user, 
          firstName: editedUser.firstName,
          lastName: editedUser.lastName 
        } : null
      }));
      
      setIsEditing(false);
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      alert('Failed to save profile changes. Please try again.');
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
        { label: 'Change Password', action: () => console.log('Change password') },
        { label: 'Privacy Settings', action: () => console.log('Privacy') }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Push Notifications', action: () => console.log('Push notifications') },
        { label: 'Email Updates', action: () => console.log('Email updates') },
        { label: 'Order Updates', action: () => console.log('Order updates') }
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Auth', action: () => console.log('2FA') },
        { label: 'Login History', action: () => console.log('Login history') },
        { label: 'Connected Devices', action: () => console.log('Devices') }
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
                  onClick={() => setIsEditing(true)}
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
                    className="flex-1"
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
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
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
                className="w-full"
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