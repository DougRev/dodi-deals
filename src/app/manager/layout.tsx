
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { Loader2, ShieldAlert, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, loadingAuth, selectedStore } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      const isManagerOrEmployee = user?.storeRole === 'Manager' || user?.storeRole === 'Employee';
      if (!isAuthenticated || !user?.assignedStoreId || !isManagerOrEmployee) {
        console.warn('[ManagerLayout] ACCESS DENIED. User is not authenticated, not assigned to a store, or not a Manager/Employee. User:', user);
        router.replace('/'); // Redirect non-staff or unassigned users to homepage
      } else {
        // Ensure the app's selectedStore aligns with the staff's assigned store if not already set
        if (selectedStore?.id !== user.assignedStoreId) {
          console.log(`[ManagerLayout] Staff's assigned store (${user.assignedStoreId}) differs from app's selected store (${selectedStore?.id}). This is informational.`);
        }
        console.log(`[ManagerLayout] Access GRANTED. User role: ${user?.storeRole}, Store: ${user.assignedStoreId}`);
      }
    }
  }, [user, isAuthenticated, loadingAuth, router, selectedStore]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verifying store staff access...</p>
      </div>
    );
  }

  const isManagerOrEmployee = user?.storeRole === 'Manager' || user?.storeRole === 'Employee';
  if (!isAuthenticated || !user?.assignedStoreId || !isManagerOrEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Card className="max-w-md p-6 shadow-xl">
          <CardHeader>
            <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-md mb-6">
              You do not have permission to view this page. Store staff (Manager or Employee) access required.
            </CardDescription>
            <Button asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If manager or employee, render the children (the manager page content)
  return (
    <div className="space-y-6">
      <header className="bg-muted/50 p-4 rounded-lg shadow-sm">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold font-headline text-primary flex items-center">
                    <Briefcase className="mr-2 h-6 w-6"/>
                    Store Operations: {selectedStore?.name || user?.assignedStoreId} 
                </h1>
                <p className="text-sm text-muted-foreground">Manage orders and settings for your store.</p>
            </div>
            {/* We can add quick links or stats here later */}
        </div>
      </header>
      {children}
    </div>
  );
}
