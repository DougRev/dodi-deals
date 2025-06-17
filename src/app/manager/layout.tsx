
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/hooks/useAppContext';
import { Loader2, ShieldAlert, Briefcase, PackagePlus, Users2, ListOrdered, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

  const isManager = user?.storeRole === 'Manager';
  const isEmployee = user?.storeRole === 'Employee';
  const isManagerOrEmployee = isManager || isEmployee;

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

  // If manager or employee, render the children
  return (
    <div className="space-y-6">
      <header className="bg-muted/50 p-4 rounded-lg shadow-sm">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold font-headline text-primary flex items-center">
                    <Briefcase className="mr-2 h-6 w-6"/>
                    Store Operations: {selectedStore?.name || user?.assignedStoreId} 
                </h1>
                <p className="text-sm text-muted-foreground">
                  Role: <span className="font-semibold text-accent">{user.storeRole}</span>. Manage operations for your store.
                </p>
            </div>
             <nav className="mt-2 sm:mt-0">
                <ul className="flex space-x-2 sm:space-x-3">
                    {isManager && (
                         <li>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/manager/dashboard" className="flex items-center">
                                    <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                                </Link>
                            </Button>
                        </li>
                    )}
                    <li>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/manager/orders" className="flex items-center">
                                <ListOrdered className="mr-1 h-4 w-4" /> Orders
                            </Link>
                        </Button>
                    </li>
                    {isManager && (
                        <>
                            <li>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/manager/stock" className="flex items-center">
                                        <PackagePlus className="mr-1 h-4 w-4" /> Stock
                                    </Link>
                                </Button>
                            </li>
                            <li>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/manager/employees" className="flex items-center">
                                        <Users2 className="mr-1 h-4 w-4" /> Employees
                                    </Link>
                                </Button>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
