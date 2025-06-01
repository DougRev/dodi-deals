export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'Vape' | 'THCa' | 'Accessory';
  stock: number;
  dataAiHint?: string;
}

export interface Deal {
  id: string;
  product: Product;
  dealPrice: number;
  expiresAt: string; // ISO date string
  title: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
