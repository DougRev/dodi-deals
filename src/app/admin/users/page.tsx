
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAllUsers, updateUserAdminStatus } from '@/lib/firestoreService';
import type { User } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { Users, ShieldCheck, Loader2, UserCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { user: currentAdminUser } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (error: any) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Error Fetching Users", description: error.message || "Could not load user data.", variant: "destructive" });
      } finally {
        setLoading(false);
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
      await updateUserAdminStatus(userId, isAdmin);
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, isAdmin } : u))
      );
      toast({ title: "User Updated", description: `Admin status for the user has been ${isAdmin ? 'granted' : 'revoked'}.` });
    } catch (error: any) {
      console.error("Failed to update admin status:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update user admin status.", variant: "destructive" });
      // Revert switch optimistic update if needed - though Switch is controlled by `user.isAdmin` so it should reflect DB state on next fetch or manual refresh
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Users className="mr-3 h-8 w-8" /> Manage Users
          </h1>
          <p className="text-muted-foreground">View registered users and manage their administrator privileges.</p>
        </div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>Overview of all registered users and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                  <TableHead className="text-center">Admin Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="profile avatar" />
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
