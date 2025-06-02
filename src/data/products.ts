
import type { Product } from '@/lib/types';

export const initialProducts: Product[] = [
  {
    id: 'prod_001',
    name: 'Indigo Haze Vape Pen',
    description: 'Premium disposable vape pen with a smooth indigo haze flavor. Rich and relaxing.',
    brand: 'Dodi Originals',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'Vape',
    dataAiHint: 'vape pen',
    availability: [
      { storeId: 'store_001', price: 29.99, stock: 50 },
      { storeId: 'store_003', price: 30.99, stock: 25 },
    ],
  },
  {
    id: 'prod_002',
    name: 'Violet Kush THCa Flower (3.5g)',
    description: 'High-quality Violet Kush THCa flower, known for its potent effects and aromatic profile.',
    brand: 'Kush Farms',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'THCa',
    dataAiHint: 'cannabis flower',
    availability: [
      { storeId: 'store_002', price: 45.00, stock: 30 },
    ],
  },
  {
    id: 'prod_003',
    name: 'Lavender Dream Vape Cartridge',
    description: 'Soothing lavender flavored vape cartridge, 1g. Compatible with most 510-thread batteries.',
    brand: 'Dream Vapes',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'Vape',
    dataAiHint: 'vape cartridge',
    availability: [
      { storeId: 'store_003', price: 24.99, stock: 75 },
      { storeId: 'store_001', price: 25.99, stock: 40, storeSpecificImageUrl: 'https://placehold.co/600x400.png' },
    ],
  },
  {
    id: 'prod_004',
    name: 'Alegreya THCa Pre-Rolls (5 pack)',
    description: 'Convenient pack of 5 pre-rolled joints featuring our signature Alegreya THCa strain.',
    brand: 'Alegreya Strains',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'THCa',
    dataAiHint: 'cannabis pre-roll',
    availability: [
      { storeId: 'store_003', price: 35.00, stock: 40 },
      { storeId: 'store_002', price: 36.50, stock: 20 },
    ],
  },
  {
    id: 'prod_005',
    name: 'Dodi Signature Grinder',
    description: 'Durable and stylish 4-piece herb grinder with Dodi branding.',
    brand: 'Dodi Accessories',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'Accessory',
    dataAiHint: 'herb grinder',
    availability: [
      { storeId: 'store_001', price: 19.99, stock: 100 },
      { storeId: 'store_002', price: 19.99, stock: 70 },
      { storeId: 'store_003', price: 20.99, stock: 50 },
    ],
  },
  {
    id: 'prod_006',
    name: 'Blueberry Bliss Vape Juice (30ml)',
    description: 'Sweet and tangy blueberry bliss e-liquid for refillable vape devices.',
    brand: 'Bliss Juices',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'Vape',
    dataAiHint: 'vape juice',
    availability: [
      { storeId: 'store_002', price: 15.99, stock: 60 },
    ],
  },
   {
    id: 'prod_007',
    name: 'Indy Special THCa Crumble (1g)',
    description: 'Potent THCa crumble, perfect for dabbing. Sourced locally for Indianapolis.',
    brand: 'Indy Concentrates',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'THCa',
    dataAiHint: 'cannabis crumble',
    availability: [
      { storeId: 'store_001', price: 55.00, stock: 20 },
    ],
  },
  {
    id: 'prod_008',
    name: 'Fort Wayne Finest Vape Battery',
    description: 'High-performance 510-thread battery, a favorite in Fort Wayne.',
    brand: 'FW Power',
    baseImageUrl: 'https://placehold.co/600x400.png',
    category: 'Accessory',
    dataAiHint: 'vape battery',
    availability: [
      { storeId: 'store_002', price: 18.00, stock: 45 },
      { storeId: 'store_001', price: 18.50, stock: 30 },
    ],
  }
];
