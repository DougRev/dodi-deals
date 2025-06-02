
import { z } from 'zod';

// Zod schema for store form validation
export const StoreSchema = z.object({
  name: z.string().min(3, { message: "Store name must be at least 3 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  hours: z.string().min(5, { message: "Operating hours must be specified." }),
});

// Type inferred from the Zod schema for form data
export type StoreFormData = z.infer<typeof StoreSchema>;

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
}

const ProductCategoryEnum = z.enum(['Vape', 'THCa', 'Accessory']);
export type ProductCategory = z.infer<typeof ProductCategoryEnum>;

// Schema for store-specific availability of a product
export const StoreAvailabilitySchema = z.object({
  storeId: z.string().nonempty({ message: "A store must be selected." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }),
  storeSpecificImageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
});
export type StoreAvailability = z.infer<typeof StoreAvailabilitySchema>;

// Zod schema for product form validation (for Admin page)
export const ProductSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  brand: z.string().min(2, { message: "Brand must be at least 2 characters." }),
  baseImageUrl: z.string().url({ message: "Please enter a valid base image URL." }).default('https://placehold.co/600x400.png'),
  category: ProductCategoryEnum,
  dataAiHint: z.string().max(50, {message: "AI Hint should be max 50 chars"}).optional().default(''),
  availability: z.array(StoreAvailabilitySchema)
    .min(1, { message: "Product must be available in at least one store." })
    .refine(items => new Set(items.map(item => item.storeId)).size === items.length, {
      message: "Each store can only have one availability entry for this product.",
    }),
});

// Type inferred from the Zod schema for product form data
export type ProductFormData = z.infer<typeof ProductSchema>;

// Main Product interface for Firestore (matches structure of ProductSchema)
export interface Product extends Omit<ProductFormData, 'availability'> {
  id: string;
  availability: StoreAvailability[];
}

// This "resolved" type is used by AppContext to provide product info to UI components
// based on the selected store.
export interface ResolvedProduct {
  id: string; // This will be the original product ID from Firestore
  name: string;
  description: string;
  brand: string;
  category: ProductCategory;
  dataAiHint?: string;
  storeId: string;      // The ID of the store for which this product is resolved
  price: number;        // Price in the specific store
  stock: number;        // Stock in the specific store
  imageUrl: string;     // Resolved image URL (storeSpecific or base) for this store context
}


export interface Deal {
  id: string;
  product: ResolvedProduct; // Deal product should be the resolved one for a specific store
  dealPrice: number;
  expiresAt: string;
  title: string;
  description?: string;
  storeId: string; // The store this deal is specifically for
}

export interface User {
  id: string; // Firebase UID
  name: string; // displayName from Firebase or custom from Firestore
  email: string; // Firebase email
  points: number; // From Firestore
  avatarUrl?: string; // Optional: URL for user's avatar from Firebase Storage/Firestore
  isAdmin: boolean; // True if the user is an administrator
}

export interface CartItem {
  product: ResolvedProduct; // Cart items should use the resolved product for the selected store
  quantity: number;
}
