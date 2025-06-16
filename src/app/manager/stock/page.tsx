
"use client";

import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PackagePlus, Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ManagerStockPage() {
  const { user } = useAppContext();

  if (user?.storeRole !== 'Manager') {
    return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to manage stock. This section is for Store Managers only.</p>
            <Button asChild className="mt-4">
                <Link href="/manager/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-primary"><PackagePlus className="mr-2 h-6 w-6" /> Manage Product Stock</CardTitle>
          <CardDescription>
            View and update stock levels for products in your store: {user.assignedStoreId}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
            <Construction className="mx-auto h-16 w-16 text-accent mb-4" />
            <p className="text-xl font-semibold text-muted-foreground">Stock Management Coming Soon!</p>
            <p className="text-sm text-muted-foreground mt-2">This section will allow you to adjust inventory for your store.</p>
        </CardContent>
      </Card>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/manager/orders">Back to Orders</Link>
          </Button>
        </div>
    </div>
  );
}
