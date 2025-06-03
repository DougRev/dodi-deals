
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllUsers, updateUserConfiguration } from '@/lib/firestoreService';
import type { User, Store } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { Users, ShieldCheck, Loader2, UserCircle, StoreIcon, Building } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { user: currentAdminUser, stores, loadingStores: appContextLoadingStores } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (error: any) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Error Fetching Users", description: error.message || "Could not load user data.", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const handleAdminStatusChange = async (userId: string, isAdmin: boolean) => {
    if (userId === currentAdminUser?.id) {
      toast({ title: "Action Not Allowed", description: "You cannot change your own admin status.", variant: "destructive" });
      return;
    }
    setUpdatingUserId(userId);
    try {
      await updateUserConfiguration(userId, { isAdmin });
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, isAdmin, assignedStoreId: isAdmin ? null : u.assignedStoreId } : u))
      );
      toast({ title: "User Updated", description: `Admin status for the user has been ${isAdmin ? 'granted' : 'revoked'}.` });
    } catch (error: any) {
      console.error("Failed to update admin status:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update user admin status.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStoreAssignmentChange = async (userId: string, storeId: string | null) => {
    if (users.find(u => u.id === userId)?.isAdmin) {
      toast({ title: "Action Not Allowed", description: "Admins cannot be assigned to a store.", variant: "default" });
      return;
    }
    setUpdatingUserId(userId);
    try {
      await updateUserConfiguration(userId, { assignedStoreId: storeId });
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, assignedStoreId: storeId } : u))
      );
      const storeName = storeId ? stores.find(s => s.id === storeId)?.name : 'Unassigned';
      toast({ title: "User Updated", description: `User has been assigned to ${storeName || 'the selected store'}.` });
    } catch (error: any) {
      console.error("Failed to update store assignment:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update store assignment.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getStoreName = (storeId?: string | null) => {
    if (!storeId) return "N/A";
    return stores.find(s => s.id === storeId)?.name || "Unknown Store";
  };

  const isLoading = loadingUsers || appContextLoadingStores;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Users className="mr-3 h-8 w-8" /> Manage Users
          </h1>
          <p className="text-muted-foreground">View users, manage admin privileges, and assign non-admin users to stores.</p>
        </div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>Overview of all registered users, their roles, and store assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No users found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead>Assigned Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="profile avatar"/>
                        <AvatarFallback>
                          {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {updatingUserId === user.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Switch
                            id={`admin-switch-${user.id}`}
                            checked={user.isAdmin}
                            onCheckedChange={(checked) => handleAdminStatusChange(user.id, checked)}
                            disabled={user.id === currentAdminUser?.id || !!updatingUserId}
                            aria-label={`Toggle admin status for ${user.name}`}
                          />
                        )}
                        <Label htmlFor={`admin-switch-${user.id}`} className={user.isAdmin ? "text-accent" : "text-muted-foreground"}>
                          {user.isAdmin ? <ShieldCheck className="h-5 w-5 inline-block mr-1 text-accent" /> : null}
                          {user.isAdmin ? 'Admin' : 'User'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      {updatingUserId === user.id && !user.isAdmin ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : user.isAdmin ? (
                        <span className="text-muted-foreground italic text-sm flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-1 text-muted-foreground/70" /> Admins (Global)
                        </span>
                      ) : (
                        <Select
                          value={user.assignedStoreId || "unassigned"}
                          onValueChange={(value) => handleStoreAssignmentChange(user.id, value === "unassigned" ? null : value)}
                          disabled={!!updatingUserId || appContextLoadingStores}
                        >
                          <SelectTrigger className="w-[220px] h-9 text-sm">
                            <SelectValue placeholder={appContextLoadingStores ? "Loading stores..." : "Select store"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="flex items-center text-muted-foreground">
                                <Building className="h-4 w-4 mr-2 opacity-70" /> Unassigned
                              </span>
                            </SelectItem>
                            {stores.map((store: Store) => (
                              <SelectItem key={store.id} value={store.id}>
                                <span className="flex items-center">
                                 <StoreIcon className="h-4 w-4 mr-2 text-accent" /> {store.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 text-center">
        <Button variant="outline" asChild>
          <Link href="/admin">Back to Admin Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
