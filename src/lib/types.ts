
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

// Zod schema for product form validation
export const ProductSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }).default('https://placehold.co/600x400.png'),
  category: ProductCategoryEnum,
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }),
  storeId: z.string().nonempty({ message: "A store must be selected." }),
  dataAiHint: z.string().optional().default(''),
});

// Type inferred from the Zod schema for product form data
export type ProductFormData = z.infer<typeof ProductSchema>;

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: ProductCategory;
  stock: number;
  storeId: string;
  dataAiHint?: string;
}

export interface Deal {
  id: string;
  product: Product;
  dealPrice: number;
  expiresAt: string;
  title: string;
  description?: string;
  storeId: string;
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
  product: Product;
  quantity: number;
}
