
"use client";

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PointsDisplay } from '@/components/site/PointsDisplay';
import { LogOut, Edit3, ShoppingBag, UserCircle, ShieldCheck, CheckCircle, Loader2, Package, Store, CalendarDays } from 'lucide-react'; 
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const avatarOptions = [
  '/icons/profile-icons/avatar1.png',
  '/icons/profile-icons/avatar2.png',
  '/icons/profile-icons/avatar3.png',
  '/icons/profile-icons/avatar4.png',
  '/icons/profile-icons/avatar5.png',
  '/icons/profile-icons/avatar6.png',
];

function formatOrderDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function ProfilePageInternal() {
  const { 
    isAuthenticated, 
    user, 
    logout, 
    loadingAuth, 
    updateUserAvatar, 
    updateUserProfileDetails,
    userOrders,
    loadingUserOrders,
    fetchUserOrders 
  } = useAppContext(); 
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

  // AppContext now handles initial and subsequent fetching of orders based on auth state
  // This useEffect for initial fetch is removed to avoid conflicts.

  if (loadingAuth || !isAuthenticated || !user) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const handleAvatarSelect = async (avatarPath: string) => {
    if (isUpdatingAvatar || user.avatarUrl === avatarPath || isUpdatingProfile) return;
    setIsUpdatingAvatar(true);
    const success = await updateUserAvatar(avatarPath);
    setIsUpdatingAvatar(false);
  };

  const handleOpenEditModal = () => {
    setEditedName(user?.name || '');
    setSelectedAvatarUrl(user?.avatarUrl); 
    setIsEditModalOpen(true);
  };

  const handleProfileDetailsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) {
      return;
    }
    if (isUpdatingAvatar || isUpdatingProfile) return;

    setIsUpdatingProfile(true);
    await updateUserProfileDetails(editedName);
    setIsUpdatingProfile(false);
  };

  const combinedLoading = isUpdatingAvatar || isUpdatingProfile;

  const getStatusBadgeVariant = (status: Order['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Pending Confirmation": return "default";
      case "Preparing": return "secondary";
      case "Ready for Pickup": return "outline"; 
      case "Completed": return "default"; 
      case "Cancelled": return "destructive";
      default: return "secondary";
    }
  };


  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Your Profile</h1>
        <p className="text-lg text-muted-foreground">Manage your account details, view points, and order history.</p>
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
                {combinedLoading && ( 
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
              <Button 
                variant="outline" 
                className="w-full text-accent border-accent hover:bg-accent/10" 
                onClick={handleOpenEditModal}
                disabled={combinedLoading}
              >
                <Edit3 className="mr-2 h-4 w-4" /> 
                {combinedLoading ? 'Updating...' : 'Edit Profile'}
              </Button>
            </CardContent>
          </Card>
           <Button onClick={logout} variant="destructive" className="w-full" disabled={combinedLoading}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <PointsDisplay />
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <ShoppingBag className="mr-3 h-6 w-6 text-primary" /> Order History
              </CardTitle>
              <CardDescription>Review your past in-store pickup orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUserOrders ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No order history yet.</p>
                  <Button asChild variant="link" className="mt-2 text-accent">
                    <Link href="/products">Start Shopping</Link>
                  </Button>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {userOrders.map((order) => (
                    <AccordionItem value={order.id} key={order.id} className="border border-border rounded-lg shadow-sm">
                      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 rounded-t-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full text-left">
                          <div className="mb-2 sm:mb-0">
                            <p className="text-xs text-muted-foreground">Order ID: {order.id.substring(0,8)}...</p>
                            <p className="text-md font-semibold text-primary">{formatOrderDate(order.orderDate)}</p>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                             <Badge variant={getStatusBadgeVariant(order.status)} className="mb-1 text-xs">{order.status}</Badge>
                             <p className="text-lg font-bold text-accent">${order.finalTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 border-t border-border bg-background rounded-b-lg">
                        <p className="text-sm font-medium mb-1 text-muted-foreground">Pickup at: <span className="font-semibold text-foreground">{order.storeName}</span></p>
                        <p className="text-xs text-muted-foreground mb-3">{order.pickupInstructions}</p>
                        <h4 className="text-md font-semibold mb-2 flex items-center"><Package className="mr-2 h-5 w-5 text-primary"/>Items:</h4>
                        <ul className="space-y-2">
                          {order.items.map((item, index) => (
                            <li key={`${order.id}-item-${index}`} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-md">
                              <div>
                                <span className="font-medium text-foreground">{item.productName}</span>
                                <span className="text-muted-foreground"> (x{item.quantity})</span>
                              </div>
                              <span className="font-semibold text-foreground">${(item.pricePerItem * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        <Separator className="my-3"/>
                        {order.subtotal !== order.finalTotal && (
                           <div className="text-sm space-y-1 mb-1">
                               <div className="flex justify-between">
                                   <span>Subtotal:</span>
                                   <span>${order.subtotal.toFixed(2)}</span>
                               </div>
                               {order.discountApplied && order.discountApplied > 0 && (
                                   <div className="flex justify-between text-destructive">
                                       <span>Points Discount:</span>
                                       <span>-${order.discountApplied.toFixed(2)}</span>
                                   </div>
                               )}
                           </div>
                        )}
                         <div className="flex justify-between font-bold text-md mt-2">
                            <span>Total Paid:</span>
                            <span>${order.finalTotal.toFixed(2)}</span>
                        </div>
                         {order.pointsRedeemed && order.pointsRedeemed > 0 && (
                             <p className="text-xs text-muted-foreground text-right mt-1">({order.pointsRedeemed} points redeemed)</p>
                         )}
                         {order.pointsEarned && order.pointsEarned > 0 && (
                            <p className="text-xs text-green-600 text-right mt-1">({order.pointsEarned} points earned on completion)</p>
                         )}

                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
            {userOrders.length > 0 && (
                 <CardFooter>
                    <Button variant="link" className="mx-auto text-accent" onClick={fetchUserOrders} disabled={loadingUserOrders}>
                        {loadingUserOrders ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Refresh Order History
                    </Button>
                 </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name or choose a new avatar. Avatar changes are applied immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-3">
            <h3 className="text-md font-semibold text-muted-foreground">Choose Your Avatar</h3>
            <div className="grid grid-cols-3 gap-2">
              {avatarOptions.map((path) => (
                <button
                  key={path}
                  onClick={() => handleAvatarSelect(path)}
                  disabled={combinedLoading}
                  className={cn(
                    "relative rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    user?.avatarUrl === path ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-accent",
                    combinedLoading ? "opacity-50 cursor-not-allowed" : "", 
                    (isUpdatingAvatar && selectedAvatarUrl === path && user?.avatarUrl !== path) ? "opacity-70" : "" 
                  )}
                >
                  <Image src={path} alt={`Avatar option`} width={80} height={80} className="aspect-square object-cover" data-ai-hint="profile avatar option"/>
                  {user?.avatarUrl === path && !isUpdatingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/70">
                      <CheckCircle className="h-6 w-6 text-primary-foreground" />
                    </div>
                  )}
                   {isUpdatingAvatar && selectedAvatarUrl === path && user?.avatarUrl !== path && ( 
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <form onSubmit={handleProfileDetailsUpdate} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="name-edit">Display Name</Label>
              <Input
                id="name-edit"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                disabled={combinedLoading}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={combinedLoading}>
                Close
              </Button>
              <Button type="submit" disabled={combinedLoading || !editedName.trim() || editedName === user.name}>
                {isUpdatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Name
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
