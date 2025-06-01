
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
