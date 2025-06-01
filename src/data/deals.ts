
import type { Deal } from '@/lib/types';
import { initialProducts } from './products';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0); // Midnight tomorrow

const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(today.getDate() + 2);
dayAfterTomorrow.setHours(10,0,0,0); // 10 AM day after tomorrow

const product1 = initialProducts.find(p => p.id === 'prod_001'); // Indigo Haze Vape Pen, store_001
const product2 = initialProducts.find(p => p.id === 'prod_002'); // Violet Kush THCa Flower, store_002

export const dailyDeals: Deal[] = [];

if (product1) {
  dailyDeals.push({
    id: 'deal_001',
    product: product1,
    dealPrice: 24.99,
    expiresAt: tomorrow.toISOString(),
    title: 'Flash Sale: Indigo Haze!',
    description: 'Get the popular Indigo Haze Vape Pen at a discounted price for a limited time!',
    storeId: product1.storeId,
  });
}

if (product2) {
  dailyDeals.push({
    id: 'deal_002',
    product: product2,
    dealPrice: 39.99,
    expiresAt: dayAfterTomorrow.toISOString(),
    title: 'THCa Special: Violet Kush',
    description: 'Experience the quality of Violet Kush THCa flower, now on offer.',
    storeId: product2.storeId,
  });
}
