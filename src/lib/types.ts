
export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'Vape' | 'THCa' | 'Accessory';
  stock: number;
  storeId: string; // Added storeId
  dataAiHint?: string;
}

export interface Deal {
  id: string;
  product: Product; // Product already has storeId
  dealPrice: number;
  expiresAt: string; // ISO date string
  title: string;
  description?: string;
  storeId: string; // Added storeId for explicit association
}

export interface User {
  id: string;
  name: string;
  email: string;
  points: number; // Points remain global for now
}

export interface CartItem {
  product: Product;
  quantity: number;
}
