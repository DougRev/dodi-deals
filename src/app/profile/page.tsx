
"use client";

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PointsDisplay } from '@/components/site/PointsDisplay';
import { LogOut, Edit3, ShoppingBag, UserCircle, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react'; 
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const avatarOptions = [
  '/icons/profile-icons/avatar1.png',
  '/icons/profile-icons/avatar2.png',
  '/icons/profile-icons/avatar3.png',
  '/icons/profile-icons/avatar4.png',
  '/icons/profile-icons/avatar5.png',
  '/icons/profile-icons/avatar6.png',
];

function ProfilePageInternal() {
  const { isAuthenticated, user, logout, loadingAuth, updateUserAvatar, updateUserProfileDetails } = useAppContext(); 
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null | undefined>(user?.avatarUrl);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);


  useEffect(() => {
    if (!loadingAuth && !isAuthenticated) {
      const redirect = searchParams.get('redirect');
      router.push(redirect ? `/login?redirect=${redirect}` : '/login?redirect=/profile');
    }
  }, [isAuthenticated, router, loadingAuth, searchParams]);

  useEffect(() => {
    setSelectedAvatarUrl(user?.avatarUrl);
    if (user?.name) {
      setEditedName(user.name);
    }
  }, [user?.avatarUrl, user?.name]);

  if (loadingAuth || !isAuthenticated || !user) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const handleAvatarSelect = async (avatarPath: string) => {
    if (isUpdatingAvatar || user.avatarUrl === avatarPath) return;
    setIsUpdatingAvatar(true);
    setSelectedAvatarUrl(avatarPath); 
    const success = await updateUserAvatar(avatarPath);
    if (!success) {
        setSelectedAvatarUrl(user.avatarUrl); 
    }
    setIsUpdatingAvatar(false);
  };

  const handleOpenEditModal = () => {
    setEditedName(user?.name || '');
    setIsEditModalOpen(true);
  };

  const handleProfileDetailsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) {
      // Basic validation, context function handles more robust validation + toast
      return;
    }
    setIsUpdatingProfile(true);
    const success = await updateUserProfileDetails(editedName);
    setIsUpdatingProfile(false);
    if (success) {
      setIsEditModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Your Profile</h1>
        <p className="text-lg text-muted-foreground">Manage your account details and view your points.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="items-center text-center">
              <div className="relative">
                <Avatar className="w-24 h-24 mb-4 border-4 border-primary">
                  <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="profile avatar large" />
                  <AvatarFallback className="text-4xl">
                      {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="h-12 w-12"/>}
                  </AvatarFallback>
                </Avatar>
                {(isUpdatingAvatar || isUpdatingProfile) && ( // Show loader if avatar or name is updating
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full mb-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
              </div>
              <CardTitle className="text-2xl font-headline flex items-center">
                {user.name || 'Dodi User'}
                {user.isAdmin && <ShieldCheck className="ml-2 h-6 w-6 text-accent" title="Administrator" />}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <h3 className="text-md font-semibold text-center text-muted-foreground mb-2">Choose Your Avatar</h3>
               <div className="grid grid-cols-3 gap-2">
                {avatarOptions.map((path) => (
                  <button
                    key={path}
                    onClick={() => handleAvatarSelect(path)}
                    disabled={isUpdatingAvatar || isUpdatingProfile}
                    className={cn(
                      "relative rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selectedAvatarUrl === path ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-accent",
                      (isUpdatingAvatar && selectedAvatarUrl === path) || isUpdatingProfile ? "opacity-70" : "",
                      (isUpdatingAvatar && selectedAvatarUrl !== path) || isUpdatingProfile ? "opacity-50 cursor-not-allowed" : ""
                    )}
                  >
                    <Image src={path} alt={`Avatar option`} width={80} height={80} className="aspect-square object-cover" data-ai-hint="profile avatar option"/>
                    {selectedAvatarUrl === path && !isUpdatingAvatar && !isUpdatingProfile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/70">
                        <CheckCircle className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                     {isUpdatingAvatar && selectedAvatarUrl === path && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full text-accent border-accent hover:bg-accent/10 mt-4" 
                onClick={handleOpenEditModal}
                disabled={isUpdatingProfile || isUpdatingAvatar}
              >
                <Edit3 className="mr-2 h-4 w-4" /> 
                {isUpdatingProfile ? 'Updating...' : 'Edit Profile Details'}
              </Button>
            </CardContent>
          </Card>
           <Button onClick={logout} variant="destructive" className="w-full" disabled={isUpdatingProfile || isUpdatingAvatar}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <PointsDisplay />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Order History</CardTitle>
              <CardDescription>View your past in-store pickup orders.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No order history yet. (Feature coming soon)</p>
              <Button asChild variant="link" className="mt-2 text-accent">
                <Link href="/products">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
            <DialogDescription>
              Make changes to your display name here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileDetailsUpdate} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="col-span-3"
                disabled={isUpdatingProfile}
              />
            </div>
          
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isUpdatingProfile}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingProfile || !editedName.trim()}>
                {isUpdatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading profile page...</p>
      </div>
    }>
      <ProfilePageInternal />
    </Suspense>
  );
}
