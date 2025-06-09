
import { z } from 'zod';

// Zod schema for store form validation

export const DayOfWeekEnum = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;
export const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Updated Product Categories
export const ProductCategoryEnum = z.enum(['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Accessory']);
export type ProductCategory = z.infer<typeof ProductCategoryEnum>;
export const productCategories: ProductCategory[] = ['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Accessory'];

// Business rules for fixed daily categories (used as fallback or informational)
export const fixedDailyCategories: Partial<Record<DayOfWeek, ProductCategory>> = {
  Monday: 'Flower',
  Tuesday: 'Edible',
  Wednesday: 'Pre-roll',
  Thursday: 'Accessory',
  Friday: 'Vape',
};

// Schema for a Custom Deal Rule
export const CustomDealRuleSchema = z.object({
  id: z.string().optional(), // For UI key management with useFieldArray
  selectedDays: z.array(DayOfWeekEnum)
    .min(1, "At least one day must be selected for the deal rule.")
    .refine(days => new Set(days).size === days.length, {
      message: "Each day can only be selected once per rule.",
    }),
  category: ProductCategoryEnum,
  discountPercentage: z.coerce
    .number()
    .min(0, { message: "Discount must be 0 or greater." })
    .max(100, { message: "Discount cannot exceed 100%." })
    .default(0),
});
export type CustomDealRule = z.infer<typeof CustomDealRuleSchema>;


export const StoreSchema = z.object({
  name: z.string().min(3, { message: "Store name must be at least 3 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  hours: z.string().min(5, { message: "Operating hours must be specified." }),
  dailyDeals: z.array(CustomDealRuleSchema).optional().default([]),
});

// Type inferred from the Zod schema for form data
export type StoreFormData = z.infer<typeof StoreSchema>;

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  dailyDeals?: CustomDealRule[]; // Array of custom deal rules
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
  category: ProductCategoryEnum,
  dataAiHint: z.string().max(50, {message: "AI Hint should be max 50 chars"}).optional().default(''),
  isFeatured: z.boolean().optional().default(false),
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
  isFeatured?: boolean;
  availability: StoreAvailability[];
}

// This "resolved" type is used by AppContext to provide product info to UI components
// based on the selected store.
export interface ResolvedProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: ProductCategory;
  dataAiHint?: string;
  isFeatured?: boolean;
  storeId: string;
  price: number; // This is the effective price (could be deal price)
  originalPrice?: number; // The base price if currently on deal, otherwise same as price or undefined
  stock: number;
  imageUrl: string;
}


// This is for the "Hot Deals" / "Special Offers" displayed to the user.
export interface Deal {
  id: string;
  product: ResolvedProduct;
  discountPercentage: number;
  expiresAt: string;
  title: string;
  description?: string;
  storeId: string;
  categoryOnDeal: ProductCategory;
}

export const StoreRoleEnum = z.enum(['Manager', 'Employee']);
export type StoreRole = z.infer<typeof StoreRoleEnum>;
export const storeRoles: StoreRole[] = ['Manager', 'Employee'];


export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
  avatarUrl?: string;
  isAdmin: boolean;
  assignedStoreId?: string | null;
  storeRole?: StoreRole | null; // Role within the assigned store
}

export interface CartItem {
  product: ResolvedProduct;
  quantity: number;
}

// Order related types
export const OrderStatusEnum = z.enum(["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export const orderStatuses: OrderStatus[] = ["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];


export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerItem: number; // Price at the time of order
  originalPricePerItem?: number; // Original price if it was a deal item
}

export interface Order {
  id: string; // Firestore document ID
  userId: string;
  userEmail: string;
  userName: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number; // Sum of item.pricePerItem * item.quantity
  discountApplied?: number; // Discount from points redemption
  pointsRedeemed?: number;
  finalTotal: number; // subtotal - discountApplied
  pointsEarned?: number; // Points earned from this order
  orderDate: string; // ISO string
  status: OrderStatus;
  pickupInstructions?: string;
}

// For Points Redemption
export interface RedemptionOption {
  id: string;
  pointsRequired: number;
  discountAmount: number; // in dollars
  description: string;
}

// Updated redemption options: 100 points = $5
export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  { id: 'redeem_5_100', pointsRequired: 100, discountAmount: 5, description: '$5 Off (100 Points)' },
  { id: 'redeem_10_200', pointsRequired: 200, discountAmount: 10, description: '$10 Off (200 Points)' },
  { id: 'redeem_15_300', pointsRequired: 300, discountAmount: 15, description: '$15 Off (300 Points)' },
  { id: 'redeem_25_500', pointsRequired: 500, discountAmount: 25, description: '$25 Off (500 Points)' },
];
