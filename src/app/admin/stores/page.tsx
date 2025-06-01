
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StoreSchema, type StoreFormData, type Store } from '@/lib/types';
import { addStore, updateStore, deleteStore } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Building } from 'lucide-react';
import Link from 'next/link';

export default function AdminStoresPage() {
  const { stores: appStores, loadingStores: loadingAppStores } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false); // For form submission

  const form = useForm<StoreFormData>({
    resolver: zodResolver(StoreSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      hours: '',
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (currentStore) {
        form.reset(currentStore);
      } else {
        form.reset({ name: '', address: '', city: '', hours: '' });
      }
    }
  }, [isFormOpen, currentStore, form]);

  const handleAddNewStore = () => {
    setCurrentStore(null);
    form.reset({ name: '', address: '', city: '', hours: '' }); // Ensure form is reset for new store
    setIsFormOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setCurrentStore(store);
    form.reset(store); // Pre-fill form with store data
    setIsFormOpen(true);
  };

  const handleDeleteStore = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStore = async () => {
    if (!storeToDelete) return;
    setLoading(true);
    try {
      await deleteStore(storeToDelete.id);
      toast({ title: "Store Deleted", description: `${storeToDelete.name} has been successfully deleted.` });
      setIsDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete store:", error);
      toast({ title: "Error Deleting Store", description: error.message || "Failed to delete store.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async (data: StoreFormData) => {
    setLoading(true);
    try {
      if (currentStore) {
        await updateStore(currentStore.id, data);
        toast({ title: "Store Updated", description: "The store details have been successfully updated." });
      } else {
        await addStore(data);
        toast({ title: "Store Added", description: "The new store has been successfully created." });
      }
      setIsFormOpen(false);
      setCurrentStore(null);
      form.reset({ name: '', address: '', city: '', hours: '' }); // Reset form after successful save
    } catch (error: any) {
      console.error("Failed to save store:", error);
      toast({ title: "Error Saving Store", description: error.message || "Failed to save store.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Building className="mr-3 h-8 w-8" /> Manage Stores
          </h1>
          <p className="text-muted-foreground">Add, edit, or remove store locations for Dodi Deals.</p>
        </div>
        <Button onClick={handleAddNewStore} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Store
        </Button>
      </header>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setCurrentStore(null); // Reset currentStore when dialog closes
            form.reset({ name: '', address: '', city: '', hours: '' });
          }
        }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {currentStore ? 'Edit Store' : 'Add New Store'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveStore)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dodi Deals - Downtown" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City & State</FormLabel>
                    <FormControl>
                      <Input placeholder="Indianapolis, IN" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Hours</FormLabel>
                    <FormControl>
                      <Input placeholder="Mon-Sat: 9am - 9pm, Sun: 10am - 6pm" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {currentStore ? 'Save Changes' : 'Create Store'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl text-destructive">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the store
              <span className="font-semibold"> {storeToDelete?.name}</span>.
              Any products associated with this store will need to be manually reassigned or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStoreToDelete(null)} disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStore} disabled={loading} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Store List</CardTitle>
          <CardDescription>Overview of all registered store locations.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAppStores ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : appStores.length === 0 ? (
            <div className="text-center py-10">
              <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No stores found.</p>
              <p className="text-muted-foreground text-sm">Click "Add New Store" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.address}</TableCell>
                    <TableCell>{store.city}</TableCell>
                    <TableCell>{store.hours}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditStore(store)} className="text-accent border-accent hover:bg-accent/10">
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteStore(store)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
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

    