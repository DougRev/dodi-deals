
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { updateProductStockForStoreByManager, addProductByManager } from '@/lib/firestoreService';
import type { Product, StoreAvailability, ProductCategory, FlowerWeightPrice, ProductFormData as AdminProductFormData, FlowerWeight } from '@/lib/types'; // Use AdminProductFormData for existing schema structure
import { ProductSchema, productCategories, flowerWeights, PREDEFINED_BRANDS } from '@/lib/types'; // Import ProductSchema for reuse if possible, or a new one
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"; // Added DialogDescription
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, Edit, AlertTriangle, Construction, PackageSearch, PlusCircle, StoreIcon, Star, Weight, Tag, UploadCloud, Image as ImageIcon, PackageIcon, XCircle } from 'lucide-react'; // Added PackageIcon
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app as firebaseApp } from '@/lib/firebase'; 

const storage = getStorage(firebaseApp);
const OTHER_BRAND_VALUE = "Other";


interface EditableProduct extends Product {
  currentStoreAvailability: StoreAvailability | undefined;
}

// Simplified Zod schema for Manager adding a product
const ManagerAddProductFormSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  brand: z.string().min(2, { message: "Brand must be at least 2 characters." }).default('Other'),
  baseImageUrl: z.string().url({ message: "Please enter a valid base image URL." }).default('https://placehold.co/600x400.png'),
  category: z.nativeEnum(productCategories),
  dataAiHint: z.string().max(50, {message: "AI Hint should be max 50 chars"}).optional().default(''),
  // Store-specific availability part
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).optional(),
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }).optional(),
  totalStockInGrams: z.coerce.number().nonnegative({ message: "Total stock in grams must be non-negative." }).optional(),
  weightOptions: z.array(z.object({
      weight: z.nativeEnum(flowerWeights),
      price: z.coerce.number().positive({ message: "Price must be positive." })
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.category === 'Flower') {
    if (data.brand !== 'Dodi Hemp') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flower products must have "Dodi Hemp" as the brand. It will be set automatically.',
        path: ['brand'],
      });
    }
    if (!data.weightOptions || data.weightOptions.length !== flowerWeights.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `For Flower products, prices for all weights (${flowerWeights.join(', ')}) must be defined.`,
        path: [`weightOptions`],
      });
    }
    if (data.totalStockInGrams === undefined || data.totalStockInGrams < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total stock in grams is required and must be non-negative for Flower products.",
        path: [`totalStockInGrams`],
      });
    }
    if (data.price !== undefined || data.stock !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price/Stock should not be set for Flower products; use Weight Options and Total Stock (grams).", path: ['price']});
    }
  } else { // Not a Flower product
    if (data.weightOptions && data.weightOptions.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Weight options are only for Flower products.", path: ['weightOptions']});
    }
    if (data.totalStockInGrams !== undefined) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total stock (grams) is only for Flower products.", path: ['totalStockInGrams']});
    }
    if (data.price === undefined || data.price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price is required and must be positive for non-Flower products.", path: ['price']});
    }
    if (data.stock === undefined || data.stock < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stock is required and must be non-negative for non-Flower products.", path: ['stock']});
    }
  }
});
type ManagerAddProductFormData = z.infer<typeof ManagerAddProductFormSchema>;


export default function ManagerStockPage() {
  const { user, selectedStore, allProducts, loadingProducts: appContextLoadingProducts, loadingAuth, stores } = useAppContext();
  const [storeProducts, setStoreProducts] = useState<EditableProduct[]>([]);
  const [loadingPageData, setLoadingPageData] = useState(true);
  
  // State for Edit Stock Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStockEdit, setSelectedProductForStockEdit] = useState<EditableProduct | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // State for Add Product Modal
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showManualBrandInputManager, setShowManualBrandInputManager] = useState(false);

  const [imageFileToUploadManager, setImageFileToUploadManager] = useState<File | null>(null);
  const [isUploadingImageManager, setIsUploadingImageManager] = useState(false);
  const [uploadImageProgressManager, setUploadImageProgressManager] = useState(0);
  const [imagePreviewUrlManager, setImagePreviewUrlManager] = useState<string | null>(null);
  const fileInputRefManager = useRef<HTMLInputElement>(null);

  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');

  const addProductForm = useForm<ManagerAddProductFormData>({
    resolver: zodResolver(ManagerAddProductFormSchema),
    defaultValues: {
      name: '',
      description: '',
      brand: '',
      baseImageUrl: 'https://placehold.co/600x400.png',
      category: productCategories[0] as ProductCategory,
      dataAiHint: '',
      // Availability fields are direct for manager's store
      price: undefined,
      stock: undefined,
      totalStockInGrams: undefined,
      weightOptions: flowerWeights.map(fw => ({ weight: fw, price: 0 })),
    },
  });

  const watchedCategoryManager = useWatch({ control: addProductForm.control, name: 'category' });
  const watchedBrandSelectionManager = useWatch({ control: addProductForm.control, name: 'brand' });
  const watchedBaseImageUrlManager = useWatch({ control: addProductForm.control, name: 'baseImageUrl' });

  useEffect(() => {
    if (watchedCategoryManager === 'Flower') {
      addProductForm.setValue('brand', 'Dodi Hemp');
      setShowManualBrandInputManager(false);
    } else {
      const selectedBrandIsOther = watchedBrandSelectionManager === OTHER_BRAND_VALUE;
      const currentCategoryBrands = PREDEFINED_BRANDS[watchedCategoryManager as ProductCategory] || [];
      const brandNotPredefined = watchedBrandSelectionManager && !currentCategoryBrands.includes(watchedBrandSelectionManager) && watchedBrandSelectionManager !== OTHER_BRAND_VALUE;

      if (selectedBrandIsOther) {
        setShowManualBrandInputManager(true);
      } else if (brandNotPredefined && isAddProductModalOpen) {
        setShowManualBrandInputManager(true);
      } else {
        setShowManualBrandInputManager(false);
      }
    }
  }, [watchedBrandSelectionManager, watchedCategoryManager, isAddProductModalOpen, addProductForm]);

   useEffect(() => {
    if (isAddProductModalOpen) {
      const defaultCat = productCategories[0] as ProductCategory;
      addProductForm.reset({
        name: '',
        description: '',
        brand: defaultCat === 'Flower' ? 'Dodi Hemp' : (PREDEFINED_BRANDS[defaultCat]?.[0] || ''),
        baseImageUrl: 'https://placehold.co/600x400.png',
        category: defaultCat,
        dataAiHint: '',
        price: undefined,
        stock: undefined,
        totalStockInGrams: undefined,
        weightOptions: flowerWeights.map(fw => ({ weight: fw, price: 0 })),
      });
      setImageFileToUploadManager(null);
      setImagePreviewUrlManager(null);
      if (fileInputRefManager.current) fileInputRefManager.current.value = "";
      setShowManualBrandInputManager(defaultCat !== 'Flower' && (addProductForm.getValues('brand') === OTHER_BRAND_VALUE || !(PREDEFINED_BRANDS[defaultCat] || []).includes(addProductForm.getValues('brand'))));

    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddProductModalOpen]);



  const uniqueCategoriesForFilter = useMemo(() => {
    const categories = new Set(storeProducts.map(p => p.category));
    return ['All', ...Array.from(categories).sort()] as ('All' | ProductCategory)[];
  }, [storeProducts]);

  const filteredStoreProducts = useMemo(() => {
    if (categoryFilter === 'All') {
      return storeProducts;
    }
    return storeProducts.filter(p => p.category === categoryFilter);
  }, [storeProducts, categoryFilter]);


  const memoizedUser = useMemo(() => user, [user]);
  const memoizedSelectedStore = useMemo(() => selectedStore, [selectedStore]);
  const memoizedAllProducts = useMemo(() => allProducts, [allProducts]);

  useEffect(() => {
    if (appContextLoadingProducts || loadingAuth) {
      setLoadingPageData(true);
      return;
    }

    if (memoizedUser?.storeRole !== 'Manager' || !memoizedSelectedStore?.id) {
      setStoreProducts([]);
      setLoadingPageData(false);
      return;
    }

    const productsInManagerStore = memoizedAllProducts
      .map(p => {
        const currentStoreAvailability = p.availability.find(avail => avail.storeId === memoizedSelectedStore!.id);
        return { ...p, currentStoreAvailability };
      })
      .filter(p => p.currentStoreAvailability !== undefined) as EditableProduct[];
    
    setStoreProducts(productsInManagerStore);
    setLoadingPageData(false);

  }, [memoizedUser, memoizedSelectedStore, memoizedAllProducts, appContextLoadingProducts, loadingAuth]);


  const handleOpenStockModal = (product: EditableProduct) => {
    setSelectedProductForStockEdit(product);
    if (product.category === 'Flower') {
      setNewStockValue(String(product.currentStoreAvailability?.totalStockInGrams ?? '0'));
    } else {
      setNewStockValue(String(product.currentStoreAvailability?.stock ?? '0'));
    }
    setIsStockModalOpen(true);
  };

  const handleSaveStock = async () => {
    if (!selectedProductForStockEdit || !memoizedUser || !memoizedSelectedStore?.id) {
      toast({ title: "Error", description: "Missing product, user, or store information.", variant: "destructive" });
      return;
    }
    if (newStockValue === "" || isNaN(Number(newStockValue)) || Number(newStockValue) < 0) {
      toast({ title: "Invalid Stock Value", description: "Stock must be a non-negative number.", variant: "destructive" });
      return;
    }

    setIsUpdatingStock(true);
    const stockNumericValue = Number(newStockValue);

    try {
      const stockUpdatePayload = selectedProductForStockEdit.category === 'Flower'
        ? { totalStockInGrams: stockNumericValue }
        : { stock: stockNumericValue };

      await updateProductStockForStoreByManager(
        selectedProductForStockEdit.id,
        memoizedSelectedStore.id,
        stockUpdatePayload,
        memoizedUser.id
      );
      
      setStoreProducts(prevProducts => 
        prevProducts.map(p => {
          if (p.id === selectedProductForStockEdit.id) {
            const updatedAvailability = { 
              ...p.currentStoreAvailability!, 
              ...(selectedProductForStockEdit.category === 'Flower' 
                  ? { totalStockInGrams: stockNumericValue } 
                  : { stock: stockNumericValue })
            };
            return { ...p, currentStoreAvailability: updatedAvailability as StoreAvailability };
          }
          return p;
        })
      );

      toast({ title: "Stock Updated", description: `Stock for ${selectedProductForStockEdit.name} has been successfully updated.` });
      setIsStockModalOpen(false);
      setSelectedProductForStockEdit(null);
      setNewStockValue("");
    } catch (error: any) {
      console.error("Failed to update stock:", error);
      toast({ title: "Error Updating Stock", description: error.message || "Failed to update stock.", variant: "destructive" });
    } finally {
      setIsUpdatingStock(false);
    }
  };
  
  const handleImageFileChangeManager = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFileToUploadManager(file);
      setImagePreviewUrlManager(URL.createObjectURL(file));
      addProductForm.setValue('baseImageUrl', '', {shouldValidate: false});
    }
  };

  const handleImageUploadManager = async () => {
    if (!imageFileToUploadManager) {
      toast({ title: "No Image Selected", description: "Please choose an image file first.", variant: "destructive" });
      return;
    }
    setIsUploadingImageManager(true);
    setUploadImageProgressManager(0);

    const imageFileName = `${imageFileToUploadManager.name}_${Date.now()}`;
    const sRef = storageRef(storage, `product_images/${imageFileName}`);
    const uploadTask = uploadBytesResumable(sRef, imageFileToUploadManager);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadImageProgressManager(progress);
      },
      (error) => {
        console.error("Manager Image upload error:", error);
        let errorMessage = error.message || "Could not upload image.";
        if ((error as any).code === 'storage/unauthorized') {
          errorMessage = "Upload failed: You do not have permission. Check Firebase Storage rules.";
        }
        toast({ title: "Image Upload Failed", description: errorMessage, variant: "destructive" });
        setIsUploadingImageManager(false);
        setUploadImageProgressManager(0);
        if (fileInputRefManager.current) fileInputRefManager.current.value = "";
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          addProductForm.setValue('baseImageUrl', downloadURL, { shouldValidate: true, shouldDirty: true });
          toast({ title: "Image Uploaded", description: "Image uploaded and URL set. Save the product to finalize." });
          setIsUploadingImageManager(false);
          setImageFileToUploadManager(null);
          setImagePreviewUrlManager(null);
          if (fileInputRefManager.current) fileInputRefManager.current.value = "";
        });
      }
    );
  };


  const handleCreateProductByManager = async (data: ManagerAddProductFormData) => {
    if (!memoizedUser || !memoizedSelectedStore?.id) {
        toast({ title: "Error", description: "User or store information is missing.", variant: "destructive"});
        return;
    }
    setIsCreatingProduct(true);

    try {
        const productCoreData: Pick<AdminProductFormData, 'name' | 'description' | 'brand' | 'category' | 'baseImageUrl' | 'dataAiHint'> = {
            name: data.name,
            description: data.description,
            brand: data.category === 'Flower' ? 'Dodi Hemp' : (data.brand === OTHER_BRAND_VALUE ? '' : data.brand), // Enforce Dodi Hemp for Flower or handle Other
            category: data.category,
            baseImageUrl: data.baseImageUrl,
            dataAiHint: data.dataAiHint,
        };
        
        const managerStoreAvailabilityData: StoreAvailability = {
            storeId: memoizedSelectedStore.id,
            storeSpecificImageUrl: undefined, // Managers don't set this on creation for simplicity
            ...(data.category === 'Flower' 
                ? { weightOptions: data.weightOptions, totalStockInGrams: data.totalStockInGrams } 
                : { price: data.price, stock: data.stock }
            ),
        };

        await addProductByManager(productCoreData, managerStoreAvailabilityData, memoizedUser.id);
        
        toast({ title: "Product Created", description: `${data.name} has been added to your store.`});
        setIsAddProductModalOpen(false);
        addProductForm.reset();
        setImageFileToUploadManager(null);
        setImagePreviewUrlManager(null);
        if (fileInputRefManager.current) fileInputRefManager.current.value = "";
        // Note: AppContext will update allProducts, and this page will re-filter.
    } catch (error: any) {
        console.error("Failed to create product by manager:", error);
        toast({ title: "Error Creating Product", description: error.message || "Failed to create product.", variant: "destructive"});
    } finally {
        setIsCreatingProduct(false);
    }
  };
  
  const managerFormCategoryBrands = PREDEFINED_BRANDS[watchedCategoryManager as ProductCategory] || [];
  const currentDisplayImageUrlManager = imagePreviewUrlManager || watchedBaseImageUrlManager || 'https://placehold.co/100x100.png?text=No+Image';


  if (loadingPageData || loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading stock information...</p>
      </div>
    );
  }

  if (memoizedUser?.storeRole !== 'Manager') {
    return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to manage stock or add products. This section is for Store Managers only.</p>
            <Button asChild className="mt-4">
              <Link href="/manager/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!memoizedSelectedStore) {
     return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive">Store Not Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your assigned store could not be determined. Please re-select your store or contact an admin.</p>
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
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle className="flex items-center text-primary"><PackagePlus className="mr-2 h-6 w-6" /> Manage Product Stock</CardTitle>
                <CardDescription>
                    View and update stock levels for products in your store: {memoizedSelectedStore.name}.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'All' | ProductCategory)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategoriesForFilter.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Button onClick={() => setIsAddProductModalOpen(true)} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Product
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {appContextLoadingProducts && storeProducts.length === 0 ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : storeProducts.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products found for your store: {memoizedSelectedStore.name}.</p>
              <p className="text-muted-foreground text-sm">Admins can assign products to this store, or you can add a new product using the button above.</p>
            </div>
          ) : filteredStoreProducts.length === 0 ? (
             <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products match the category '{categoryFilter}'.</p>
              <p className="text-muted-foreground text-sm">Try selecting a different category or "All".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStoreProducts.map((product) => {
                    const stockDisplay = product.category === 'Flower'
                      ? `${product.currentStoreAvailability?.totalStockInGrams ?? 0} g`
                      : `${product.currentStoreAvailability?.stock ?? 0} units`;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded-md overflow-hidden border border-muted relative">
                            <Image src={product.baseImageUrl} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="48px" data-ai-hint={product.dataAiHint || "product small"}/>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{stockDisplay}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenStockModal(product)} className="text-accent border-accent hover:bg-accent/10">
                            <Edit className="mr-1 h-4 w-4" /> Edit Stock
                          </Button>
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

      {/* Dialog for Editing Stock */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock for: {selectedProductForStockEdit?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stockValue">
                {selectedProductForStockEdit?.category === 'Flower' ? 'Total Stock (grams)' : 'Stock Quantity'}
              </Label>
              <Input
                id="stockValue"
                type="number"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder={selectedProductForStockEdit?.category === 'Flower' ? 'e.g., 100.5' : 'e.g., 50'}
                min="0"
                step={selectedProductForStockEdit?.category === 'Flower' ? "0.1" : "1"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockModalOpen(false)} disabled={isUpdatingStock}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={isUpdatingStock} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isUpdatingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding New Product by Manager */}
      <Dialog open={isAddProductModalOpen} onOpenChange={(isOpen) => {
          setIsAddProductModalOpen(isOpen);
          if (!isOpen) {
            addProductForm.reset();
            setShowManualBrandInputManager(false);
            setImageFileToUploadManager(null);
            setImagePreviewUrlManager(null);
            setIsUploadingImageManager(false);
            setUploadImageProgressManager(0);
            if (fileInputRefManager.current) fileInputRefManager.current.value = "";
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary flex items-center">
                <PackageIcon className="mr-2 h-7 w-7"/> Add New Product to Your Store
            </DialogTitle>
            <DialogDescription>
              This product will initially only be available at {memoizedSelectedStore?.name}. An admin can make it available at other stores later.
            </DialogDescription>
          </DialogHeader>
          <Form {...addProductForm}>
            <form onSubmit={addProductForm.handleSubmit(handleCreateProductByManager)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={addProductForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., Dodi Special Flower" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <FormItem>
                  <FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground"/>Brand</FormLabel>
                  {watchedCategoryManager === 'Flower' ? (
                     <Input value="Dodi Hemp" disabled className="mt-1 bg-muted/50" />
                  ) : (managerFormCategoryBrands.length > 0 || showManualBrandInputManager) ? (
                    <FormField
                      control={addProductForm.control}
                      name="brand"
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) => field.onChange(value)}
                          value={showManualBrandInputManager && field.value !== OTHER_BRAND_VALUE && !managerFormCategoryBrands.includes(field.value) ? OTHER_BRAND_VALUE : field.value || ''}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select brand or 'Other'" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {managerFormCategoryBrands.map(brandName => (<SelectItem key={brandName} value={brandName}>{brandName}</SelectItem>))}
                            <SelectItem value={OTHER_BRAND_VALUE}>Other...</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                     <FormField control={addProductForm.control} name="brand" render={({ field }) => (<Input placeholder="Enter brand name" {...field} className="mt-1" />)} />
                  )}
                  {watchedCategoryManager !== 'Flower' && showManualBrandInputManager && (
                    <FormField control={addProductForm.control} name="brand" render={({ field: manualField }) => (
                        <Input placeholder="Enter brand name" {...manualField} value={manualField.value === OTHER_BRAND_VALUE ? "" : manualField.value} onChange={(e) => manualField.onChange(e.target.value)} className="mt-2"/>
                    )}/>
                  )}
                   <FormMessage>{addProductForm.formState.errors.brand?.message}</FormMessage>
                </FormItem>
              </div>

              <FormField control={addProductForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed product description..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={addProductForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'Flower') {
                                addProductForm.setValue('brand', 'Dodi Hemp'); 
                                setShowManualBrandInputManager(false);
                            } else {
                                const newCategoryBrands = PREDEFINED_BRANDS[value as ProductCategory] || [];
                                addProductForm.setValue('brand', newCategoryBrands[0] || '');
                            }
                        }}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>{productCategories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={addProductForm.control} name="dataAiHint" render={({ field }) => (<FormItem><FormLabel>Image AI Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g., green flower (max 2 words)" {...field} /></FormControl><FormDescription>Keywords for AI image search.</FormDescription><FormMessage /></FormItem>)}/>
              </div>
              
              <Card className="p-4 space-y-3 shadow-sm">
                <FormLabel className="text-md font-semibold text-primary flex items-center"><ImageIcon className="mr-2 h-5 w-5"/>Product Image</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <FormField control={addProductForm.control} name="baseImageUrl" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel className="text-xs">Manual Image URL</FormLabel>
                          <FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} disabled={!!imageFileToUploadManager || isUploadingImageManager} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator className="my-3 md:hidden"/>
                     <input type="file" ref={fileInputRefManager} onChange={handleImageFileChangeManager} accept="image/*" className="hidden" disabled={isUploadingImageManager}/>
                    <Button type="button" variant="outline" onClick={() => fileInputRefManager.current?.click()} disabled={isUploadingImageManager} className="w-full mb-2">
                      <UploadCloud className="mr-2 h-4 w-4" /> Choose Image File
                    </Button>
                    {imageFileToUploadManager && !isUploadingImageManager && (
                      <Button type="button" onClick={handleImageUploadManager} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Upload Selected Image</Button>
                    )}
                    {isUploadingImageManager && (
                      <div className="w-full text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                        <Progress value={uploadImageProgressManager} className="w-full h-2" /><p className="text-xs text-muted-foreground mt-1">{Math.round(uploadImageProgressManager)}% uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                      <Label className="text-xs mb-1 self-start">Preview</Label>
                      <div className="w-32 h-32 rounded-md overflow-hidden border border-muted relative bg-muted/30 flex items-center justify-center">
                        <Image src={currentDisplayImageUrlManager} alt="Product preview" fill style={{ objectFit: 'cover' }} sizes="128px" onError={(e) => e.currentTarget.src = 'https://placehold.co/128x128.png?text=Error'}/>
                      </div>
                      {imageFileToUploadManager && <p className="text-xs text-muted-foreground mt-1 truncate w-full text-center" title={imageFileToUploadManager.name}>{imageFileToUploadManager.name}</p>}
                  </div>
                </div>
              </Card>

              {/* Availability Section for Manager's Store */}
              <Card className="p-4 space-y-3 shadow-sm border-primary">
                <FormLabel className="text-md font-semibold text-primary flex items-center"><StoreIcon className="mr-2 h-5 w-5"/>Availability for {memoizedSelectedStore?.name}</FormLabel>
                 {watchedCategoryManager === 'Flower' ? (
                    <>
                        <FormField control={addProductForm.control} name="totalStockInGrams" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><PackagePlus className="mr-2 h-4 w-4"/>Total Stock (grams)</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} step="0.1" /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="space-y-3 pt-2 border-t mt-3">
                            <FormLabel className="text-sm font-medium text-primary flex items-center"><Weight className="mr-2 h-4 w-4"/>Weight Option Prices</FormLabel>
                            {flowerWeights.map((fw, index) => (
                                <Card key={fw} className="p-3 bg-muted/50">
                                    <FormLabel className="text-xs font-semibold">{fw}</FormLabel>
                                    <FormField control={addProductForm.control} name={`weightOptions.${index}.price`} render={({ field: weightPriceField }) => (
                                        <FormItem><FormLabel className="text-xs">Price ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...weightPriceField} value={weightPriceField.value ?? ''} onChange={e => weightPriceField.onChange(parseFloat(e.target.value) || undefined)} step="0.01" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Controller name={`weightOptions.${index}.weight`} control={addProductForm.control} defaultValue={fw} render={({ field }) => <input type="hidden" {...field} />} />
                                </Card>
                            ))}
                             <FormMessage>{addProductForm.formState.errors.weightOptions?.message || addProductForm.formState.errors.weightOptions?.root?.message}</FormMessage>
                             <FormMessage>{addProductForm.formState.errors.totalStockInGrams?.message}</FormMessage>
                        </div>
                    </>
                 ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={addProductForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" placeholder="29.99" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} step="0.01" /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={addProductForm.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} step="1" /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                 )}
              </Card>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)} disabled={isCreatingProduct || isUploadingImageManager}>Cancel</Button>
                <Button type="submit" disabled={isCreatingProduct || isUploadingImageManager} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {(isCreatingProduct || isUploadingImageManager) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Product
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      <div className="mt-8 text-center">
        <Button variant="outline" asChild>
          <Link href="/manager/orders">Back to Orders</Link>
        </Button>
      </div>
    </div>
  );
}

    
