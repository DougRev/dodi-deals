

import { z } from 'zod';

// Zod schema for store form validation

export const DayOfWeekEnum = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;
export const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Updated Product Categories
export const ProductCategoryEnum = z.enum(['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Hemp Accessory', 'E-Liquid', 'Drinks']);
export type ProductCategory = z.infer<typeof ProductCategoryEnum>;
export const productCategories: ProductCategory[] = ['Vape', 'Flower', 'Pre-roll', 'Edible', 'Concentrate', 'Hemp Accessory', 'E-Liquid', 'Drinks'];

// Predefined brands for product categories
export const PREDEFINED_BRANDS: Partial<Record<ProductCategory, string[]>> = {
  'Vape': ["Geek Bar", "Mr. Fog", "Fifty Bar", "Dodi Hemp"],
  'Flower': ["Dodi Hemp"],
  'Pre-roll': ["Dodi Hemp"],
  'Edible': ["CannaElite", "Hidden Hills", "Dodi Hemp"],
  'Concentrate': ["Dodi Hemp", "Indy Concentrates"],
  'Hemp Accessory': ["Dodi Accessories", "RAW", "Zig-Zag", "Grav Labs", "Shine Papers", "Generic Glass", "Generic Papers", "Generic Grinder"],
  'E-Liquid': ["Juice Head", "Twist", "Squeeze"],
  'Drinks': ["Generic Drink Brand", "Dodi Drinks"], // Added Drinks
};


// Business rules for fixed daily categories (used as fallback or informational) - REMOVED as new logic is more complex
// export const fixedDailyCategories: Partial<Record<DayOfWeek, ProductCategory>> = {
//   Monday: 'Flower',
//   Tuesday: 'Vape',
//   Wednesday: 'Pre-roll',
//   Thursday: 'Hemp Accessory',
//   Friday: 'Vape',
// };

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

// --- Product Related Schemas & Types ---

// Define standard flower weights
export const FlowerWeightEnum = z.nativeEnum(["3.5g", "7g", "14g", "1oz"]);
export type FlowerWeight = z.infer<typeof FlowerWeightEnum>;
export const flowerWeights: FlowerWeight[] = ["3.5g", "7g", "14g", "1oz"];

// Helper function to convert FlowerWeight string to grams
export function flowerWeightToGrams(weight: FlowerWeight): number {
  switch (weight) {
    case "3.5g": return 3.5;
    case "7g": return 7;
    case "14g": return 14;
    case "1oz": return 28; // Using common approximation
    default: throw new Error(`Unknown flower weight: ${weight}`);
  }
}

// Schema for a single weight option for flowers, including its price
export const FlowerWeightPriceSchema = z.object({
  weight: FlowerWeightEnum,
  price: z.coerce.number().positive({ message: "Price for this weight must be a positive number." }),
});
export type FlowerWeightPrice = z.infer<typeof FlowerWeightPriceSchema>;

// Schema for store-specific availability of a product
export const StoreAvailabilitySchema = z.object({
  storeId: z.string().nonempty({ message: "A store must be selected." }),
  // For non-Flower products
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).optional(),
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }).optional(),
  // For Flower products
  totalStockInGrams: z.coerce.number().nonnegative({ message: "Total stock in grams must be a non-negative number." }).optional(),
  weightOptions: z.array(FlowerWeightPriceSchema)
    .optional()
    .refine(options => !options || new Set(options.map(opt => opt.weight)).size === options.length, {
      message: "Each weight can only be defined once per store for flower products.",
    }),
  storeSpecificImageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
});
export type StoreAvailability = z.infer<typeof StoreAvailabilitySchema>;

// Zod schema for product form validation (for Admin page)
export const ProductSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  brand: z.string().min(2, { message: "Brand must be at least 2 characters." }).default('Other'),
  baseImageUrl: z.string().url({ message: "Please enter a valid base image URL." }).default('https://placehold.co/600x400.png'),
  category: z.nativeEnum(productCategories),
  dataAiHint: z.string().max(50, {message: "AI Hint should be max 50 chars"}).optional().default(''),
  isFeatured: z.boolean().optional().default(false),
  availability: z.array(StoreAvailabilitySchema)
    .min(1, { message: "Product must be available in at least one store." })
    .refine(items => new Set(items.map(item => item.storeId)).size === items.length, {
      message: "Each store can only have one availability entry for this product.",
    }),
}).superRefine((data, ctx) => {
  if (data.category === 'Flower' && data.brand !== 'Dodi Hemp') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Flower products must have "Dodi Hemp" as the brand.',
      path: ['brand'],
    });
  }
  data.availability.forEach((avail, index) => {
    if (data.category === 'Flower') {
      if (!avail.weightOptions || avail.weightOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flower products require price definition for available weights. Ensure all standard weights (${flowerWeights.join(', ')}) are considered if applicable.`,
          path: [`availability`, index, `weightOptions`],
        });
      } else {
         const definedWeights = avail.weightOptions.map(wo => wo.weight);
        const missingWeights = flowerWeights.filter(fw => !definedWeights.includes(fw));
        if (missingWeights.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Flower products are missing price definitions for the following standard weights: ${missingWeights.join(', ')}. Please add them.`,
                path: [`availability`, index, `weightOptions`],
            });
        }
      }
      if (avail.totalStockInGrams === undefined || avail.totalStockInGrams === null || avail.totalStockInGrams < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total stock in grams is required and must be non-negative for Flower products.",
          path: [`availability`, index, `totalStockInGrams`],
        });
      }
      if (avail.price !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Base price should not be set for Flower products; define prices within weight options.",
          path: [`availability`, index, `price`],
        });
      }
      if (avail.stock !== undefined) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Base stock should not be set for Flower products; use Total Stock (grams).",
          path: [`availability`, index, `stock`],
        });
      }
    } else { // Not a Flower product
      if (avail.weightOptions && avail.weightOptions.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Weight options should only be defined for Flower products.",
          path: [`availability`, index, `weightOptions`],
        });
      }
      if (avail.totalStockInGrams !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total stock in grams should only be defined for Flower products.",
          path: [`availability`, index, `totalStockInGrams`],
        });
      }
      if (avail.price === undefined || avail.price === null || avail.price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Price is required and must be positive for non-Flower products.",
          path: [`availability`, index, `price`],
        });
      }
      if (avail.stock === undefined || avail.stock === null || avail.stock < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Stock is required and must be non-negative for non-Flower products.",
          path: [`availability`, index, `stock`],
        });
      }
    }
  });
});

// Type inferred from the Zod schema for product form data
export type ProductFormData = z.infer<typeof ProductSchema>;

// Main Product interface for Firestore (matches structure of ProductSchema)
export interface Product extends Omit<ProductFormData, 'availability' | 'category' | 'isFeatured'> {
  id: string;
  category: ProductCategory; // Ensure category is part of the base Product
  isFeatured?: boolean; // Make isFeatured optional as managers won't set it
  availability: StoreAvailability[];
}

// This "resolved" type is used by AppContext to provide product info to UI components
// based on the selected store.
export interface ResolvedProduct {
  id: string;
  variantId: string; // Unique identifier for product + weight combination
  name: string;
  description: string;
  brand: string;
  category: ProductCategory;
  dataAiHint?: string;
  isFeatured?: boolean;
  storeId: string;
  price: number;
  stock: number;
  totalStockInGrams?: number;
  availableWeights?: FlowerWeightPrice[];
  originalPrice?: number;
  imageUrl: string;
  selectedWeight?: FlowerWeight;
  isBogoEligible?: boolean; // New flag for Tuesday E-Liquid BOGO
}


// This is for the "Hot Deals" / "Special Offers" displayed to the user.
export interface Deal {
  id: string;
  product?: ResolvedProduct; // Optional for general banner deals
  discountPercentage?: number; // Optional for BOGO
  expiresAt: string;
  title: string;
  description?: string;
  storeId: string;
  categoryOnDeal?: ProductCategory;
  brandOnDeal?: string; // For "Dodi brand" deals
  dealType?: 'percentage' | 'bogo'; // To differentiate deal types
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
  storeRole?: StoreRole | null;
  noShowStrikes: number; // Added for 3-strike rule
  isBanned: boolean;     // Added for 3-strike rule
  createdAt: string;     // Ensure createdAt is part of the User type
}

export interface CartItem {
  product: ResolvedProduct;
  quantity: number;
  selectedWeight?: FlowerWeight;
}

// Order related types
export const OrderStatusEnum = z.enum(["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export const orderStatuses: OrderStatus[] = ["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];

export const CancellationReasonEnum = z.enum(["Inventory Issue", "Customer No-Show", "Customer Request", "Other"]);
export type CancellationReason = z.infer<typeof CancellationReasonEnum>;
export const cancellationReasons: CancellationReason[] = ["Inventory Issue", "Customer No-Show", "Customer Request", "Other"];


export interface OrderItem {
  productId: string;
  productName: string;
  selectedWeight?: FlowerWeight;
  quantity: number;
  pricePerItem: number;
  originalPricePerItem?: number;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName:string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  discountApplied?: number;
  pointsRedeemed?: number;
  finalTotal: number;
  pointsEarned?: number;
  orderDate: string;
  status: OrderStatus;
  pickupInstructions?: string;
  userStrikesAtOrderTime?: number; // Store user's strike count at the time of order
  cancellationReason?: CancellationReason;
  cancellationDescription?: string;
}

// For Points Redemption
export interface RedemptionOption {
  id: string;
  pointsRequired: number;
  discountAmount: number;
  description: string;
}

export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  { id: 'redeem_5_100', pointsRequired: 100, discountAmount: 5, description: '$5 Off (100 Points)' },
  { id: 'redeem_10_200', pointsRequired: 200, discountAmount: 10, description: '$10 Off (200 Points)' },
  { id: 'redeem_15_300', pointsRequired: 300, discountAmount: 15, description: '$15 Off (300 Points)' },
  { id: 'redeem_25_500', pointsRequired: 500, discountAmount: 25, description: '$25 Off (500 Points)' },
];

    

