
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building, Package, Users, LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-4xl font-bold font-headline text-primary">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">Manage your application settings and data.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/stores" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Building className="h-10 w-10 mb-2 text-accent" />
              <CardTitle>Manage Stores</CardTitle>
              <CardDescription>Add, edit, or remove store locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Go to Stores</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/products" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Package className="h-10 w-10 mb-2 text-accent" />
              <CardTitle>Manage Products</CardTitle>
              <CardDescription>Update product details, stock, and assign to stores.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Go to Products</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-accent" />
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>View users and manage admin roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Go to Users</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

