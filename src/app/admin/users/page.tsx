
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed TabsContent, not needed here
import { getAllUsers, updateUserConfiguration } from '@/lib/firestoreService';
import type { User, Store, StoreRole } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { Users, ShieldCheck, Loader2, UserCircle, StoreIcon, Building, Search as SearchIcon, Briefcase } from 'lucide-react';
import Link from 'next/link';

type UserFilter = "all" | "admins" | "storeStaff" | "generalUsers";
const storeRoles: StoreRole[] = ['Employee', 'Manager'];

export default function AdminUsersPage() {
  const { user: currentAdminUser, stores, loadingStores: appContextLoadingStores } = useAppContext();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsersState, setLoadingUsersState] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all");

  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsersState(true);
      try {
        const fetchedUsers = await getAllUsers();
        setAllUsers(fetchedUsers);
      } catch (error: any) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Error Fetching Users", description: error.message || "Could not load user data.", variant: "destructive" });
      } finally {
        setLoadingUsersState(false);
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
      // When making a user an admin, their storeId and storeRole are nulled by firestoreService
      await updateUserConfiguration(userId, { isAdmin }); 
      setAllUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, isAdmin, assignedStoreId: isAdmin ? null : u.assignedStoreId, storeRole: isAdmin ? null : u.storeRole } : u))
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
    if (allUsers.find(u => u.id === userId)?.isAdmin) {
      toast({ title: "Action Not Allowed", description: "Admins cannot be assigned to a store.", variant: "default" });
      return;
    }
    setUpdatingUserId(userId);
    try {
      // If assigning to a store, default role to 'Employee' if not already set or changing.
      // If unassigning, role will be nulled.
      const currentUser = allUsers.find(u => u.id === userId);
      const newRole = storeId ? (currentUser?.storeRole || 'Employee') : null;

      await updateUserConfiguration(userId, { assignedStoreId: storeId, storeRole: newRole });
      setAllUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, assignedStoreId: storeId, storeRole: newRole } : u))
      );
      const storeName = storeId ? stores.find(s => s.id === storeId)?.name : 'Unassigned';
      toast({ title: "User Updated", description: `User assignment changed to ${storeName || 'the selected store'}. Role set to ${newRole || 'N/A'}.` });
    } catch (error: any) {
      console.error("Failed to update store assignment:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update store assignment.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };
  
  const handleStoreRoleChange = async (userId: string, role: StoreRole | null) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate || userToUpdate.isAdmin || !userToUpdate.assignedStoreId) {
      toast({ title: "Action Not Allowed", description: "Role can only be set for non-admin users assigned to a store.", variant: "default" });
      return;
    }
    setUpdatingUserId(userId);
    try {
      await updateUserConfiguration(userId, { storeRole: role });
      setAllUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, storeRole: role } : u))
      );
      toast({ title: "User Updated", description: `User's store role set to ${role || 'N/A'}.` });
    } catch (error: any) {
      console.error("Failed to update store role:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update store role.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };


  const filteredUsers = useMemo(() => {
    let usersToFilter = [...allUsers];

    if (activeFilter === "admins") {
      usersToFilter = usersToFilter.filter(user => user.isAdmin);
    } else if (activeFilter === "storeStaff") {
      usersToFilter = usersToFilter.filter(user => !user.isAdmin && !!user.assignedStoreId);
    } else if (activeFilter === "generalUsers") {
      usersToFilter = usersToFilter.filter(user => !user.isAdmin && !user.assignedStoreId);
    }

    if (searchTerm) {
      usersToFilter = usersToFilter.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return usersToFilter;
  }, [allUsers, searchTerm, activeFilter]);

  const isLoading = loadingUsersState || appContextLoadingStores;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Users className="mr-3 h-8 w-8" /> Manage Users
          </h1>
          <p className="text-muted-foreground">View users, manage roles, and assign store staff.</p>
        </div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>Filter and search through all registered users.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as UserFilter)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="all">All Users ({allUsers.length})</TabsTrigger>
              <TabsTrigger value="admins">Admins ({allUsers.filter(u => u.isAdmin).length})</TabsTrigger>
              <TabsTrigger value="storeStaff">Store Staff ({allUsers.filter(u => !u.isAdmin && !!u.assignedStoreId).length})</TabsTrigger>
              <TabsTrigger value="generalUsers">General Users ({allUsers.filter(u => !u.isAdmin && !u.assignedStoreId).length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                {searchTerm ? 'No users match your search criteria.' : 'No users in this category.'}
              </p>
               {searchTerm && <Button variant="link" onClick={() => setSearchTerm('')}>Clear search</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead>Assigned Store</TableHead>
                    <TableHead>Store Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
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
                          {updatingUserId === user.id && !user.isAdmin && !user.assignedStoreId ? ( // Show loader only if this specific action is for admin toggle
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
                        {updatingUserId === user.id && typeof user.assignedStoreId !== 'undefined' && !user.isAdmin ? ( // Loader for store assignment change
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : user.isAdmin ? (
                          <span className="text-muted-foreground italic text-sm flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-1 text-muted-foreground/70" /> Global Admin
                          </span>
                        ) : (
                          <Select
                            value={user.assignedStoreId || "unassigned"}
                            onValueChange={(value) => handleStoreAssignmentChange(user.id, value === "unassigned" ? null : value)}
                            disabled={!!updatingUserId || appContextLoadingStores}
                          >
                            <SelectTrigger className="w-[200px] h-9 text-sm">
                              <SelectValue placeholder={appContextLoadingStores ? "Loading..." : "Select store"} />
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
                      <TableCell>
                        {updatingUserId === user.id && typeof user.storeRole !== 'undefined' && user.assignedStoreId && !user.isAdmin ? ( // Loader for role change
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : !user.isAdmin && user.assignedStoreId ? (
                          <Select
                            value={user.storeRole || "Employee"} // Default to Employee if null but assigned
                            onValueChange={(value) => handleStoreRoleChange(user.id, value as StoreRole)}
                            disabled={!!updatingUserId}
                          >
                            <SelectTrigger className="w-[150px] h-9 text-sm">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {storeRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                   <span className="flex items-center">
                                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" /> {role}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
