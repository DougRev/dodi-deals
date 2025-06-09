
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

// --- Product Related Schemas & Types ---

// Define standard flower weights
export const FlowerWeightEnum = z.enum(["3.5g", "7g", "14g", "1oz"]);
export type FlowerWeight = z.infer<typeof FlowerWeightEnum>;
export const flowerWeights: FlowerWeight[] = ["3.5g", "7g", "14g", "1oz"];

// Schema for a single weight option for flowers, including its price and stock
export const FlowerWeightPriceStockSchema = z.object({
  weight: FlowerWeightEnum,
  price: z.coerce.number().positive({ message: "Price for this weight must be a positive number." }),
  stock: z.coerce.number().int().nonnegative({ message: "Stock for this weight must be a non-negative integer." })
});
export type FlowerWeightPriceStock = z.infer<typeof FlowerWeightPriceStockSchema>;

// Schema for store-specific availability of a product
export const StoreAvailabilitySchema = z.object({
  storeId: z.string().nonempty({ message: "A store must be selected." }),
  // For non-Flower products
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).optional(),
  stock: z.coerce.number().int().nonnegative({ message: "Stock must be a non-negative integer." }).optional(),
  // For Flower products
  weightOptions: z.array(FlowerWeightPriceStockSchema)
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
}).superRefine((data, ctx) => {
  data.availability.forEach((avail, index) => {
    if (data.category === 'Flower') {
      if (!avail.weightOptions || avail.weightOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flower products require at least one weight option (e.g., 3.5g) with price and stock for each store.",
          path: [`availability`, index, `weightOptions`],
        });
      } else if (avail.weightOptions.length > 0 && flowerWeights.some(fw => !avail.weightOptions?.find(wo => wo.weight === fw))) {
        // Optional: could warn if not all standard weights are defined, but not strictly an error if at least one is.
        // For now, just ensure at least one is present.
      }
      if (avail.price !== undefined && avail.price !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Base price should not be set for Flower products; define prices within weight options.",
          path: [`availability`, index, `price`],
        });
      }
      if (avail.stock !== undefined && avail.stock !== null) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Base stock should not be set for Flower products; define stock within weight options.",
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
export interface Product extends Omit<ProductFormData, 'availability' | 'category'> {
  id: string;
  category: ProductCategory; // Ensure category is part of the base Product
  isFeatured?: boolean;
  availability: StoreAvailability[]; // This type now supports optional weightOptions
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
  // For non-flower products:
  price: number; // Base price or price of default/selected weight for flowers
  stock: number; // Base stock or stock of default/selected weight for flowers
  // For flower products:
  availableWeights?: FlowerWeightPriceStock[]; // Populated if category is Flower
  originalPrice?: number; // The base price if currently on deal, otherwise same as price or undefined
  imageUrl: string;
}


// This is for the "Hot Deals" / "Special Offers" displayed to the user.
export interface Deal {
  id: string;
  product: ResolvedProduct; // Deal will be on a specific variant/weight of a flower if applicable
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
  product: ResolvedProduct; // This will need to contain the base product info
  quantity: number;
  selectedWeight?: FlowerWeight; // For flower products
  priceAtPurchase: number; // The actual price for the selected weight/deal
}

// Order related types
export const OrderStatusEnum = z.enum(["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export const orderStatuses: OrderStatus[] = ["Pending Confirmation", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];


export interface OrderItem {
  productId: string;
  productName: string;
  selectedWeight?: FlowerWeight; // For flower products
  quantity: number;
  pricePerItem: number; // Price at the time of order for the specific weight/deal
  originalPricePerItem?: number; // Original price if it was a deal item
}

export interface Order {
  id: string; // Firestore document ID
  userId: string;
  userEmail: string;
  userName:string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number; // Sum of item.pricePerItem * item.quantity
  discountApplied?: number; // Discount from points redemption
  pointsRedeemed?: number;
  finalTotal: number; // subtotal - discountApplied
  pointsEarned?: number; // Points earned from this order (calculated at completion)
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
