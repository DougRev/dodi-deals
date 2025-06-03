
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, loadingAuth } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    console.log('[AdminLayout] Effect triggered. loadingAuth:', loadingAuth, 'isAuthenticated:', isAuthenticated, 'user:', user);
    if (!loadingAuth) {
      if (!isAuthenticated || !user?.isAdmin) {
        console.warn('[AdminLayout] ACCESS DENIED. User is not authenticated or not an admin. User:', user, 'IsAuthenticated:', isAuthenticated, 'User isAdmin:', user?.isAdmin);
        router.replace('/'); // Redirect non-admins to homepage
      } else {
        console.log('[AdminLayout] Access GRANTED. User isAdmin:', user?.isAdmin);
      }
    } else {
      console.log('[AdminLayout] Still loading authentication...');
    }
  }, [user, isAuthenticated, loadingAuth, router]);

  if (loadingAuth) {
    console.log('[AdminLayout] Rendering loading spinner for auth.');
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    console.log('[AdminLayout] Rendering Access Denied card. isAuthenticated:', isAuthenticated, 'user?.isAdmin:', user?.isAdmin);
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Card className="max-w-md p-6 shadow-xl">
          <CardHeader>
            <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-md mb-6">
              You do not have permission to view this page. (Client-side check)
            </CardDescription>
            <Button asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('[AdminLayout] Rendering admin children content.');
  // If admin, render the children (the admin page content)
  return <>{children}</>;
}


    
