
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { updateProductStockForStoreByManager, addProductByManager } from '@/lib/firestoreService';
import type { Product, StoreAvailability, ProductCategory, FlowerWeightPrice, ProductFormData as AdminProductFormData, FlowerWeight, Store } from '@/lib/types'; // Use AdminProductFormData for existing schema structure
import { ProductSchema, productCategories, flowerWeights, PREDEFINED_BRANDS, ProductCategoryEnum, FlowerWeightEnum, SUBCATEGORIES_MAP } from '@/lib/types'; // Import ProductSchema for reuse if possible, or a new one
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"; // Added DialogDescription
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, Edit, AlertTriangle, Construction, PackageSearch, PlusCircle, StoreIcon, Star, Weight, Tag, UploadCloud, Image as ImageIcon, PackageIcon, XCircle, Filter, Layers, LayoutDashboard } from 'lucide-react'; // Added PackageIcon, Filter, Layers
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage as firebaseClientStorage } from '@/lib/firebase';  // Use client-side storage

const OTHER_BRAND_VALUE = "Other";
const SUBCATEGORY_NONE_VALUE = "_NONE_"; // Used for form where empty string not allowed for SelectItem value


interface EditableProduct extends Product {
  currentStoreAvailability: StoreAvailability | undefined;
}

// Simplified Zod schema for Manager adding a product
const ManagerAddProductFormSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  brand: z.string().min(2, { message: "Brand must be at least 2 characters." }), 
  baseImageUrl: z.string().url({ message: "Please enter a valid base image URL." }).default('https://placehold.co/600x400.png'),
  category: ProductCategoryEnum,
  dataAiHint: z.string().max(50, {message: "AI Hint should be max 50 chars"}).optional().default(''),
  // Store-specific availability part
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).optional(),
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }).optional(),
  totalStockInGrams: z.coerce.number().nonnegative({ message: "Total stock in grams must be non-negative." }).optional(),
  weightOptions: z.array(z.object({
      weight: FlowerWeightEnum,
      price: z.coerce.number().positive({ message: "Price for this weight must be positive." })
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
    if (!data.weightOptions || data.weightOptions.length === 0) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `For Flower products, prices for all weights must be defined.`,
        path: [`weightOptions`],
      });
    } else {
        const definedWeights = data.weightOptions.map(wo => wo.weight);
        const missingWeights = flowerWeights.filter(fw => !definedWeights.includes(fw));
        if (missingWeights.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Flower products are missing price definitions for: ${missingWeights.join(', ')}.`,
                path: [`weightOptions`],
            });
        }
        data.weightOptions.forEach((wo, index) => {
            if (wo.price <= 0) { 
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Price for weight ${wo.weight} must be positive.`,
                    path: [`weightOptions`, index, `price`],
                });
            }
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
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Base Price/Stock should not be set for Flower products.", path: ['price']});
    }
  } else { 
    if (data.brand === OTHER_BRAND_VALUE && !data.brand.startsWith("Generic Brand") ) { 
      const form = (ctx as any)._ctx.form; 
      if(form && form.getFieldState('brand').isDirty){
         ctx.addIssue({code: z.ZodIssueCode.custom, message: "If 'Other' brand is selected, you must enter a custom brand name in the text field.", path: ['brand']});
      }
    }
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
  const { user: memoizedUser, allProducts, loadingProducts: appContextLoadingProducts, loadingAuth, stores } = useAppContext();
  const [storeProducts, setStoreProducts] = useState<EditableProduct[]>([]);
  const [loadingPageData, setLoadingPageData] = useState(true);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStockEdit, setSelectedProductForStockEdit] = useState<EditableProduct | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showManualBrandInputManager, setShowManualBrandInputManager] = useState(false);

  const [imageFileToUploadManager, setImageFileToUploadManager] = useState<File | null>(null);
  const [isUploadingImageManager, setIsUploadingImageManager] = useState(false);
  const [uploadImageProgressManager, setUploadImageProgressManager] = useState(0);
  const [imagePreviewUrlManager, setImagePreviewUrlManager] = useState<string | null>(null);
  const fileInputRefManager = useRef<HTMLInputElement>(null);

  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');
  const [brandFilter, setBrandFilter] = useState<'All' | string>('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState<'All' | string>('All');
  
  const managerAssignedStore = useMemo(() => {
    if (!memoizedUser?.assignedStoreId || !stores || stores.length === 0) return null;
    return stores.find(s => s.id === memoizedUser.assignedStoreId) || null;
  }, [memoizedUser?.assignedStoreId, stores]);
  
  const defaultCategoryForForm = productCategories[0] as ProductCategory;
  const defaultBrandForForm = defaultCategoryForForm === 'Flower' ? 'Dodi Hemp' : (PREDEFINED_BRANDS[defaultCategoryForForm]?.[0] || OTHER_BRAND_VALUE);

  const addProductForm = useForm<ManagerAddProductFormData>({
    resolver: zodResolver(ManagerAddProductFormSchema),
    defaultValues: {
      name: '',
      description: '',
      brand: defaultBrandForForm,
      baseImageUrl: 'https://placehold.co/600x400.png',
      category: defaultCategoryForForm,
      dataAiHint: '',
      price: defaultCategoryForForm === 'Flower' ? undefined : 0,
      stock: defaultCategoryForForm === 'Flower' ? undefined : 0,
      totalStockInGrams: defaultCategoryForForm === 'Flower' ? 0 : undefined,
      weightOptions: defaultCategoryForForm === 'Flower' ? flowerWeights.map(fw => ({ weight: fw, price: 0 })) : undefined,
    },
  });

  const watchedCategoryManager = useWatch({ control: addProductForm.control, name: 'category' });
  const watchedBrandSelectionManager = useWatch({ control: addProductForm.control, name: 'brand' });
  const watchedBaseImageUrlManager = useWatch({ control: addProductForm.control, name: 'baseImageUrl' });

  useEffect(() => {
    if (Object.keys(addProductForm.formState.errors).length > 0) {
        console.log("[ManagerStockPage] Add Product Form Validation Errors:", JSON.stringify(addProductForm.formState.errors, null, 2));
    }
  }, [addProductForm.formState.errors]);


  useEffect(() => {
    if (addProductForm.formState.isSubmitted) return; 

    const currentCategory = addProductForm.getValues('category'); 

    if (currentCategory === 'Flower') {
      if (addProductForm.getValues('brand') !== 'Dodi Hemp') {
        addProductForm.setValue('brand', 'Dodi Hemp', { shouldValidate: true });
      }
      setShowManualBrandInputManager(false);
      addProductForm.setValue('price', undefined, { shouldValidate: true });
      addProductForm.setValue('stock', undefined, { shouldValidate: true });
      
      if (!addProductForm.getValues('weightOptions')) {
           addProductForm.setValue('weightOptions', flowerWeights.map(fw => ({ weight: fw, price: 0 })), { shouldValidate: true });
      }
      if (addProductForm.getValues('totalStockInGrams') === undefined) {
           addProductForm.setValue('totalStockInGrams', 0, { shouldValidate: true });
      }
    } else { 
      addProductForm.setValue('weightOptions', undefined, { shouldValidate: true });
      addProductForm.setValue('totalStockInGrams', undefined, { shouldValidate: true });

      const brandValue = addProductForm.getValues('brand');
      const currentCategoryBrands = PREDEFINED_BRANDS[currentCategory as ProductCategory] || [];
      if (brandValue === 'Dodi Hemp' || (!currentCategoryBrands.includes(brandValue) && brandValue !== OTHER_BRAND_VALUE)) {
         addProductForm.setValue('brand', currentCategoryBrands[0] || OTHER_BRAND_VALUE, { shouldValidate: true });
      }
      
      const newBrandValue = addProductForm.getValues('brand');
      setShowManualBrandInputManager(newBrandValue === OTHER_BRAND_VALUE || !currentCategoryBrands.includes(newBrandValue));

      if (addProductForm.getValues('price') === undefined) {
           addProductForm.setValue('price', 0, { shouldValidate: true }); 
      }
      if (addProductForm.getValues('stock') === undefined) {
           addProductForm.setValue('stock', 0, { shouldValidate: true }); 
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCategoryManager]); 

  useEffect(() => {
    if (watchedCategoryManager !== 'Flower') {
        const currentBrand = addProductForm.getValues('brand');
        const currentCategoryBrands = PREDEFINED_BRANDS[watchedCategoryManager as ProductCategory] || [];
        setShowManualBrandInputManager(currentBrand === OTHER_BRAND_VALUE || !currentCategoryBrands.includes(currentBrand));
    } else {
        setShowManualBrandInputManager(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBrandSelectionManager, watchedCategoryManager]);


   useEffect(() => {
    if (isAddProductModalOpen) {
      const defaultCat = productCategories[0] as ProductCategory;
      const defaultBrandForCat = defaultCat === 'Flower' ? 'Dodi Hemp' : (PREDEFINED_BRANDS[defaultCat]?.[0] || OTHER_BRAND_VALUE);
      
      addProductForm.reset({
        name: '',
        description: '',
        brand: defaultBrandForCat,
        baseImageUrl: 'https://placehold.co/600x400.png',
        category: defaultCat,
        dataAiHint: '',
        price: defaultCat === 'Flower' ? undefined : 0,
        stock: defaultCat === 'Flower' ? undefined : 0,
        totalStockInGrams: defaultCat === 'Flower' ? 0 : undefined,
        weightOptions: defaultCat === 'Flower' ? flowerWeights.map(fw => ({ weight: fw, price: 0 })) : undefined,
      });
      
      setImageFileToUploadManager(null);
      setImagePreviewUrlManager(null);
      if (fileInputRefManager.current) fileInputRefManager.current.value = "";
      
      if (defaultCat !== 'Flower') {
        const resetBrand = addProductForm.getValues('brand'); 
        const resetCategoryBrands = PREDEFINED_BRANDS[defaultCat] || [];
        setShowManualBrandInputManager(resetBrand === OTHER_BRAND_VALUE || !resetCategoryBrands.includes(resetBrand));
      } else {
        setShowManualBrandInputManager(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddProductModalOpen]);


  useEffect(() => {
    if (appContextLoadingProducts || loadingAuth) {
      setLoadingPageData(true);
      return;
    }

    if (memoizedUser?.storeRole !== 'Manager' || !memoizedUser?.assignedStoreId) {
      setStoreProducts([]);
      setLoadingPageData(false);
      return;
    }

    const productsInManagerStore = allProducts
      .map(p => {
        const currentStoreAvailability = p.availability.find(avail => avail.storeId === memoizedUser!.assignedStoreId);
        return { ...p, currentStoreAvailability };
      })
      .filter(p => p.currentStoreAvailability !== undefined) as EditableProduct[];
    
    setStoreProducts(productsInManagerStore);
    setLoadingPageData(false);

  }, [memoizedUser, allProducts, appContextLoadingProducts, loadingAuth]);


  const uniqueCategoriesForFilterManager = useMemo(() => {
    const categories = new Set(storeProducts.map(p => p.category));
    return ['All', ...Array.from(categories).sort()] as ('All' | ProductCategory)[];
  }, [storeProducts]);

  const uniqueBrandsForFilterManager = useMemo(() => {
    const relevantProducts = categoryFilter === 'All' 
      ? storeProducts 
      : storeProducts.filter(p => p.category === categoryFilter);
    const brands = new Set(relevantProducts.map(p => p.brand));
    return ['All', ...Array.from(brands).sort()];
  }, [storeProducts, categoryFilter]);

  const subcategoriesForSelectedCategoryFilter = useMemo(() => {
    if (categoryFilter === 'All') return ['All'];
    const subcats = SUBCATEGORIES_MAP[categoryFilter as ProductCategory] || [];
    return ['All', ...subcats];
  }, [categoryFilter]);


  const filteredStoreProducts = useMemo(() => {
    return storeProducts.filter(product => {
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
      const matchesBrand = brandFilter === 'All' || product.brand === brandFilter;
      const matchesSubcategory = subcategoryFilter === 'All' || (product.subcategory || '') === subcategoryFilter;
      return matchesCategory && matchesBrand && matchesSubcategory;
    });
  }, [storeProducts, categoryFilter, brandFilter, subcategoryFilter]);


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
    if (!selectedProductForStockEdit || !memoizedUser || !memoizedUser.assignedStoreId) {
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
        memoizedUser.assignedStoreId,
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
      console.error("[ManagerStockPage] Failed to update stock:", error);
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
    const sRef = storageRef(firebaseClientStorage, `product_images/${imageFileName}`); // Use imported storage
    const uploadTask = uploadBytesResumable(sRef, imageFileToUploadManager);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadImageProgressManager(progress);
      },
      (error) => {
        console.error("[ManagerStockPage] Manager Image upload error:", error);
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
    console.log("[ManagerStockPage] Client: Submit Handler - Form Data:", JSON.stringify(data, null, 2));
    if (!memoizedUser || !memoizedUser.assignedStoreId || memoizedUser.storeRole !== 'Manager') {
        toast({ title: "Error", description: "User is not a manager, or store information is missing.", variant: "destructive"});
        console.error("[ManagerStockPage] Client: User is not a manager or assigned store is missing for product creation.");
        setIsCreatingProduct(false);
        return;
    }
    
    console.log(`[ManagerStockPage] Client: Manager User ID: ${memoizedUser.id}, Manager Assigned Store ID: ${memoizedUser.assignedStoreId}`);

    setIsCreatingProduct(true);
    console.log("[ManagerStockPage] Client: isCreatingProduct set to true.");

    try {
        let finalBrand = data.brand;
        if (data.category === 'Flower') {
            finalBrand = 'Dodi Hemp';
        } else if (data.brand === OTHER_BRAND_VALUE) {
            console.warn(`[ManagerStockPage] Client: Brand was '${data.brand}' (OTHER_BRAND_VALUE). If a custom brand was expected but not typed, it will default.`);
            finalBrand = data.brand.trim() === "" || data.brand === OTHER_BRAND_VALUE ? "Generic Brand" : data.brand; 
        }

        const productCoreData: Pick<AdminProductFormData, 'name' | 'description' | 'brand' | 'category' | 'baseImageUrl' | 'dataAiHint' | 'subcategory'> = { // Changed to AdminProductFormData type
            name: data.name,
            description: data.description,
            brand: finalBrand, 
            category: data.category,
            subcategory: undefined, // Manager form doesn't set this, it's an admin concept
            baseImageUrl: data.baseImageUrl,
            dataAiHint: data.dataAiHint || '',
        };
        
        const managerStoreAvailabilityData: StoreAvailability = {
            storeId: memoizedUser.assignedStoreId!,
            storeSpecificImageUrl: undefined, 
            ...(data.category === 'Flower' 
                ? { weightOptions: data.weightOptions!, totalStockInGrams: data.totalStockInGrams! } 
                : { price: data.price!, stock: data.stock! }
            ),
        };
        
        console.log("[ManagerStockPage] Client: Calling addProductByManager server action with productCoreData:", 
          JSON.stringify(productCoreData, null, 2), 
          "and managerStoreAvailabilityData:", JSON.stringify(managerStoreAvailabilityData, null, 2),
          "by managerUserId:", memoizedUser.id
        );
        
        await addProductByManager(productCoreData, managerStoreAvailabilityData, memoizedUser.id);
        
        console.log("[ManagerStockPage] Client: addProductByManager successful.");
        toast({ title: "Product Created", description: `${data.name} has been added to your store.`});
        setIsAddProductModalOpen(false);
        setImageFileToUploadManager(null);
        setImagePreviewUrlManager(null);
        if (fileInputRefManager.current) fileInputRefManager.current.value = "";
        
    } catch (error: any) {
        console.error("[ManagerStockPage] Client: Failed to create product by manager:", error, error.stack);
        toast({ title: "Error Creating Product", description: error.message || "Failed to create product.", variant: "destructive"});
    } finally {
        console.log("[ManagerStockPage] Client: Setting isCreatingProduct to false in finally block.");
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
              <Link href="/manager/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!managerAssignedStore) {
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
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle className="flex items-center text-primary"><PackagePlus className="mr-2 h-6 w-6" /> Manage Product Stock</CardTitle>
                <CardDescription>
                    View and update stock levels for products in your store: {managerAssignedStore.name}.
                </CardDescription>
            </div>
            <Button onClick={() => setIsAddProductModalOpen(true)} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Product
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t mt-4">
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center"><Filter className="mr-1 h-3 w-3"/>Category</Label>
                <Select value={categoryFilter} onValueChange={(value) => {setCategoryFilter(value as 'All' | ProductCategory); setBrandFilter('All'); setSubcategoryFilter('All');}}>
                    <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategoriesForFilterManager.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center"><Tag className="mr-1 h-3 w-3"/>Brand</Label>
                <Select value={brandFilter} onValueChange={(value) => setBrandFilter(value as 'All' | string)} disabled={categoryFilter === 'All' && uniqueBrandsForFilterManager.length <= 1}>
                    <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Filter by Brand" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueBrandsForFilterManager.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center"><Layers className="mr-1 h-3 w-3"/>Subcategory</Label>
                <Select 
                    value={subcategoryFilter} 
                    onValueChange={(value) => setSubcategoryFilter(value as 'All' | string)}
                    disabled={categoryFilter === 'All' || (subcategoriesForSelectedCategoryFilter.length <= 1 && subcategoriesForSelectedCategoryFilter[0] === 'All')}
                >
                    <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Filter by Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                        {subcategoriesForSelectedCategoryFilter.map(subcat => <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {appContextLoadingProducts && storeProducts.length === 0 ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : storeProducts.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products found for your store: {managerAssignedStore.name}.</p>
              <p className="text-muted-foreground text-sm">Admins can assign products to this store, or you can add a new product using the button above.</p>
            </div>
          ) : filteredStoreProducts.length === 0 ? (
             <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products match the current filters.</p>
              <p className="text-muted-foreground text-sm">Try adjusting your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category / Sub</TableHead>
                    <TableHead>Brand</TableHead>
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
                        <TableCell>
                            {product.category}
                            {product.subcategory && <span className="block text-xs text-muted-foreground">↳ {product.subcategory}</span>}
                        </TableCell>
                        <TableCell>{product.brand}</TableCell>
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

      <Dialog open={isAddProductModalOpen} onOpenChange={(isOpen) => {
          setIsAddProductModalOpen(isOpen);
          if (!isOpen) {
            // Resetting is now primarily handled by the useEffect watching isAddProductModalOpen
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary flex items-center">
                <PackageIcon className="mr-2 h-7 w-7"/> Add New Product to Your Store
            </DialogTitle>
            <DialogDescription>
              This product will initially only be available at {managerAssignedStore?.name}. An admin can make it available at other stores later.
            </DialogDescription>
          </DialogHeader>
          <Form {...addProductForm}>
            <form onSubmit={addProductForm.handleSubmit(handleCreateProductByManager, (errors) => console.error("[ManagerStockPage] Zod Validation Errors on Submit:", errors) )} className="space-y-6 py-4">
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
                           onValueChange={(value) => {
                                field.onChange(value);
                            }}
                           value={field.value || ''}
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

              <Card className="p-4 space-y-3 shadow-sm border-primary">
                <FormLabel className="text-md font-semibold text-primary flex items-center"><StoreIcon className="mr-2 h-5 w-5"/>Availability for {managerAssignedStore?.name}</FormLabel>
                 {watchedCategoryManager === 'Flower' ? (
                    <>
                        <FormField control={addProductForm.control} name="totalStockInGrams" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><PackagePlus className="mr-2 h-4 w-4"/>Total Stock (grams)</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} step="0.1" /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="space-y-3 pt-2 border-t mt-3">
                            <FormLabel className="text-sm font-medium text-primary flex items-center"><Weight className="mr-2 h-4 w-4"/>Weight Option Prices</FormLabel>
                            {flowerWeights.map((fw, index) => (
                                <Card key={fw} className="p-3 bg-muted/50">
                                    <FormLabel className="text-xs font-semibold">{fw}</FormLabel>
                                    <FormField control={addProductForm.control} name={`weightOptions.${index}.price`} render={({ field: weightPriceField }) => (
                                        <FormItem><FormLabel className="text-xs">Price ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...weightPriceField} value={weightPriceField.value ?? ''} onChange={e => weightPriceField.onChange(e.target.value)} step="0.01" /></FormControl><FormMessage /></FormItem>
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
                        <FormField control={addProductForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" placeholder="29.99" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} step="0.01" /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={addProductForm.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} step="1" /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                 )}
              </Card>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)} disabled={isCreatingProduct || isUploadingImageManager}>Cancel</Button>
                <Button type="submit" disabled={isCreatingProduct || isUploadingImageManager || !addProductForm.formState.isValid} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            <Link href="/manager/dashboard" className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4"/> Back to Dashboard
            </Link>
        </Button>
      </div>
    </div>
  );
}
