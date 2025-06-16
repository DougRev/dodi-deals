
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllUsers, updateUserConfiguration } from '@/lib/firestoreService';
import type { User, Store } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { Users2, UserPlus, UserMinus, Loader2, UserCircle, Search as SearchIcon, ShieldAlert, Briefcase } from 'lucide-react';
import Link from 'next/link';

type UserFilterManager = "all" | "myStoreEmployees" | "potentialHires" | "otherStaff";

export default function ManagerEmployeesPage() {
  const { user: managerUser, stores, loadingStores: appContextLoadingStores, selectedStore } = useAppContext();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsersState, setLoadingUsersState] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilterManager>("all");

  const managerStoreId = managerUser?.assignedStoreId;

  useEffect(() => {
    async function fetchUsers() {
      if (!managerUser || managerUser.storeRole !== 'Manager') {
        setLoadingUsersState(false);
        return;
      }
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
  }, [managerUser]);

  const handleAssignEmployee = async (targetUser: User) => {
    if (!managerUser || !managerStoreId || managerUser.storeRole !== 'Manager') {
      toast({ title: "Permission Denied", description: "You are not authorized to perform this action.", variant: "destructive" });
      return;
    }
    if (targetUser.isAdmin || targetUser.storeRole === 'Manager') {
      toast({ title: "Action Not Allowed", description: "Cannot assign admin or other managers.", variant: "destructive" });
      return;
    }
     if (targetUser.assignedStoreId && targetUser.assignedStoreId !== managerStoreId) {
      toast({ title: "Action Not Allowed", description: "User is already assigned to another store.", variant: "destructive" });
      return;
    }


    setUpdatingUserId(targetUser.id);
    try {
      await updateUserConfiguration(
        targetUser.id,
        { assignedStoreId: managerStoreId, storeRole: 'Employee', isAdmin: false }, // Explicitly set isAdmin false
        managerUser.id // Calling user (the manager)
      );
      setAllUsers(prevUsers =>
        prevUsers.map(u => (u.id === targetUser.id ? { ...u, assignedStoreId: managerStoreId, storeRole: 'Employee', isAdmin: false } : u))
      );
      const storeName = stores.find(s => s.id === managerStoreId)?.name || managerStoreId;
      toast({ title: "User Assigned", description: `${targetUser.name} has been assigned as Employee to ${storeName}.` });
    } catch (error: any) {
      console.error("Failed to assign employee:", error);
      toast({ title: "Assignment Failed", description: error.message || "Could not assign employee.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveEmployee = async (targetUser: User) => {
    if (!managerUser || !managerStoreId || managerUser.storeRole !== 'Manager' || targetUser.assignedStoreId !== managerStoreId) {
      toast({ title: "Permission Denied", description: "You can only remove employees from your own store.", variant: "destructive" });
      return;
    }
    if (targetUser.isAdmin || targetUser.storeRole === 'Manager') {
      toast({ title: "Action Not Allowed", description: "Cannot remove admin or managers.", variant: "destructive" });
      return;
    }


    setUpdatingUserId(targetUser.id);
    try {
      await updateUserConfiguration(
        targetUser.id,
        { assignedStoreId: null, storeRole: null, isAdmin: false }, // Explicitly set isAdmin false
        managerUser.id // Calling user (the manager)
      );
      setAllUsers(prevUsers =>
        prevUsers.map(u => (u.id === targetUser.id ? { ...u, assignedStoreId: null, storeRole: null, isAdmin: false } : u))
      );
      const storeName = stores.find(s => s.id === managerStoreId)?.name || managerStoreId;
      toast({ title: "User Removed", description: `${targetUser.name} has been unassigned from ${storeName}.` });
    } catch (error: any) {
      console.error("Failed to remove employee:", error);
      toast({ title: "Removal Failed", description: error.message || "Could not remove employee.", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    let usersToFilter = [...allUsers];
    if (!managerStoreId) return [];

    if (activeFilter === "myStoreEmployees") {
      usersToFilter = usersToFilter.filter(user => user.assignedStoreId === managerStoreId && user.storeRole === 'Employee');
    } else if (activeFilter === "potentialHires") {
      usersToFilter = usersToFilter.filter(user => !user.isAdmin && !user.assignedStoreId && !user.storeRole);
    } else if (activeFilter === "otherStaff") {
      usersToFilter = usersToFilter.filter(user => 
        user.id !== managerUser?.id && // Exclude current manager
        !user.isAdmin && 
        ((user.assignedStoreId && user.assignedStoreId !== managerStoreId) || (user.storeRole === 'Manager' && user.id !== managerUser?.id))
      );
    }

    if (searchTerm) {
      usersToFilter = usersToFilter.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return usersToFilter;
  }, [allUsers, searchTerm, activeFilter, managerStoreId, managerUser?.id]);

  const getStoreName = (storeId: string | null | undefined) => {
    if (!storeId) return "N/A";
    return stores.find(s => s.id === storeId)?.name || "Unknown Store";
  };

  const isLoading = loadingUsersState || appContextLoadingStores;

  if (!managerUser || managerUser.storeRole !== 'Manager') {
    return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to manage employees. This section is for Store Managers only.</p>
            <Button asChild className="mt-4">
                <Link href="/manager/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
   if (!managerStoreId) {
     return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive">Store Not Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You are not currently assigned to a store. Please contact an administrator.</p>
             <Button asChild className="mt-4">
                <Link href="/">Go Home</Link>
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
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center text-primary"><Users2 className="mr-2 h-6 w-6" /> Manage Store Employees</CardTitle>
              <CardDescription>
                Assign or remove employees for your store: {selectedStore?.name || managerStoreId}.
              </CardDescription>
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
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as UserFilterManager)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="myStoreEmployees">My Store's Employees</TabsTrigger>
              <TabsTrigger value="potentialHires">Potential Hires</TabsTrigger>
              <TabsTrigger value="otherStaff">Other Store Staff</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <Users2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                {searchTerm ? 'No users match your search.' : 'No users found in this category.'}
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
                    <TableHead>Current Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((targetUser) => {
                    let statusText = "Unassigned";
                    if (targetUser.isAdmin) statusText = "Site Administrator";
                    else if (targetUser.storeRole === 'Manager') statusText = `Manager at ${getStoreName(targetUser.assignedStoreId)}`;
                    else if (targetUser.storeRole === 'Employee') statusText = `Employee at ${getStoreName(targetUser.assignedStoreId)}`;

                    const canAssign = managerUser && managerUser.id !== targetUser.id &&
                                     !targetUser.isAdmin && targetUser.storeRole !== 'Manager' &&
                                     (!targetUser.assignedStoreId || targetUser.assignedStoreId === managerStoreId) &&
                                     !(targetUser.assignedStoreId === managerStoreId && targetUser.storeRole === 'Employee');

                    const canRemove = managerUser && managerUser.id !== targetUser.id &&
                                     !targetUser.isAdmin && targetUser.storeRole === 'Employee' &&
                                     targetUser.assignedStoreId === managerStoreId;
                                     
                    return (
                      <TableRow key={targetUser.id}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={targetUser.avatarUrl || undefined} alt={targetUser.name} data-ai-hint="profile avatar"/>
                            <AvatarFallback>
                              {targetUser.name ? targetUser.name.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{targetUser.name}</TableCell>
                        <TableCell>{targetUser.email}</TableCell>
                        <TableCell>
                           <span className="flex items-center text-sm">
                            {targetUser.isAdmin ? <ShieldAlert className="h-4 w-4 mr-1 text-destructive"/> : 
                             (targetUser.storeRole === 'Manager' || targetUser.storeRole === 'Employee') ? <Briefcase className="h-4 w-4 mr-1 text-accent"/> : 
                             <UserCircle className="h-4 w-4 mr-1 text-muted-foreground"/>
                            }
                            {statusText}
                           </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {updatingUserId === targetUser.id ? (
                            <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                          ) : (
                            <div className="space-x-2">
                              {canAssign && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignEmployee(targetUser)}
                                  disabled={!!updatingUserId}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <UserPlus className="mr-1 h-4 w-4" /> Assign to My Store
                                </Button>
                              )}
                              {canRemove && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveEmployee(targetUser)}
                                  disabled={!!updatingUserId}
                                >
                                  <UserMinus className="mr-1 h-4 w-4" /> Remove from My Store
                                </Button>
                              )}
                              {(!canAssign && !canRemove && targetUser.id !== managerUser?.id && !targetUser.isAdmin) && (
                                 <span className="text-xs text-muted-foreground italic">No actions</span>
                              )}
                              {targetUser.id === managerUser?.id && (
                                <span className="text-xs text-muted-foreground italic">This is you</span>
                              )}
                               {targetUser.isAdmin && targetUser.id !== managerUser?.id && (
                                <span className="text-xs text-destructive italic">Admin User</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
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

