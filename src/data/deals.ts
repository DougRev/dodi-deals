import type { Deal } from '@/lib/types';
import { initialProducts } from './products';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0); // Midnight tomorrow

const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(today.getDate() + 2);
dayAfterTomorrow.setHours(10,0,0,0); // 10 AM day after tomorrow

export const dailyDeals: Deal[] = [
  {
    id: 'deal_001',
    product: initialProducts[0], // Indigo Haze Vape Pen
    dealPrice: 24.99,
    expiresAt: tomorrow.toISOString(),
    title: 'Flash Sale: Indigo Haze!',
    description: 'Get the popular Indigo Haze Vape Pen at a discounted price for a limited time!',
  },
  {
    id: 'deal_002',
    product: initialProducts[1], // Violet Kush THCa Flower
    dealPrice: 39.99,
    expiresAt: dayAfterTomorrow.toISOString(),
    title: 'THCa Special: Violet Kush',
    description: 'Experience the quality of Violet Kush THCa flower, now on offer.',
  },
];
