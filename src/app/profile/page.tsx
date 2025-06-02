
"use client";

import { useEffect, Suspense } from 'react'; // Import Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PointsDisplay } from '@/components/site/PointsDisplay';
import { LogOut, Edit3, ShoppingBag, UserCircle, ShieldCheck } from 'lucide-react'; 
import Link from 'next/link';

function ProfilePageInternal() {
  const { isAuthenticated, user, logout, loadingAuth } = useAppContext(); 
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loadingAuth && !isAuthenticated) {
      const redirect = searchParams.get('redirect');
      router.push(redirect ? `/login?redirect=${redirect}` : '/login?redirect=/profile');
    }
  }, [isAuthenticated, router, loadingAuth, searchParams]);

  if (loadingAuth || !isAuthenticated || !user) { 
    return <div className="text-center py-10">Loading profile...</div>; 
  }

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
              <Avatar className="w-24 h-24 mb-4 border-4 border-primary">
                 <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="profile avatar large" />
                <AvatarFallback className="text-4xl">
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="h-12 w-12"/>}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl font-headline flex items-center">
                {user.name || 'Dodi User'}
                {user.isAdmin && <ShieldCheck className="ml-2 h-6 w-6 text-accent" title="Administrator" />}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
               <Button variant="outline" className="w-full text-accent border-accent hover:bg-accent/10" disabled>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
              </Button>
            </CardContent>
          </Card>
           <Button onClick={logout} variant="destructive" className="w-full">
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
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading profile page...</div>}>
      <ProfilePageInternal />
    </Suspense>
  );
}
