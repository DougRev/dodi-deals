
import { z } from 'zod';

// Zod schema for store form validation

export const DayOfWeekEnum = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;
export const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Updated Product Categories
export const ProductCategoryEnum = z.enum(['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Accessory']);
export type ProductCategory = z.infer<typeof ProductCategoryEnum>;
export const productCategories: ProductCategory[] = ['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Accessory'];

// Business rules for fixed daily categories
export const fixedDailyCategories: Partial<Record<DayOfWeek, ProductCategory>> = {
  Monday: 'Flower',
  Tuesday: 'Edible',
  Wednesday: 'Pre-roll',
  Thursday: 'Accessory', // For Glassware
  Friday: 'Vape',
};

// Schema for what's stored in Firestore per day for a store's daily deal configuration
export const StoreDailyDealSettingSchema = z.object({
  category: ProductCategoryEnum, // Category for the deal (fixed for Mon-Fri, selectable for Sat/Sun)
  discountPercentage: z.coerce
    .number()
    .min(0, { message: "Discount must be 0 or greater." })
    .max(100, { message: "Discount cannot exceed 100%." })
    .default(0),
});
export type StoreDailyDealSetting = z.infer<typeof StoreDailyDealSettingSchema>;

// Schema for the `dailyDeals` object within a Store document/form
const StoreDailyDealsSetupSchema = z.record(DayOfWeekEnum, StoreDailyDealSettingSchema.optional());

export const StoreSchema = z.object({
  name: z.string().min(3, { message: "Store name must be at least 3 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  hours: z.string().min(5, { message: "Operating hours must be specified." }),
  dailyDeals: StoreDailyDealsSetupSchema.optional().default({}), // Default to empty object
});

// Type inferred from the Zod schema for form data
export type StoreFormData = z.infer<typeof StoreSchema>;

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  dailyDeals?: Partial<Record<DayOfWeek, StoreDailyDealSetting>>;
}


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
  category: ProductCategoryEnum, // Uses updated categories
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
  id: string;
  name: string;
  description: string;
  brand: string;
  category: ProductCategory; // Uses updated categories
  dataAiHint?: string;
  storeId: string;
  price: number;
  stock: number;
  imageUrl: string;
}

// This is for the "Hot Deals" / "Special Offers" displayed to the user.
// It represents a specific product that is currently on sale due to a daily category discount.
export interface Deal {
  id: string; // e.g., product_id + day_of_week to make it unique for display
  product: ResolvedProduct; // The specific product that is on sale
  dealPrice: number;        // The calculated discounted price
  originalPrice: number;    // The product's original price
  discountPercentage: number; // The percentage applied
  expiresAt: string;        // Typically end of the current day
  title: string;            // e.g., "Monday Flower Special!" or product name
  description?: string;     // Could be specific to the deal or product's desc
  storeId: string;
  categoryOnDeal: ProductCategory; // The category that triggered this deal
}


// This is for the new "Daily Recurring Deals" managed in Firestore per store
// (This type might not be directly used if dailyDeals in Store is StoreDailyDealSetting)
export interface ResolvedDailyDealItem {
  product: ResolvedProduct;
  dealPrice: number;
  dayOfWeek: DayOfWeek;
}


export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface CartItem {
  product: ResolvedProduct;
  quantity: number;
}
