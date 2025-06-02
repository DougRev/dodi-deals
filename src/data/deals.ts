
import type { Deal, ResolvedProduct } from '@/lib/types';
import { initialProducts } from './products'; // These are core Product definitions

// This seed data needs to be adapted. Deals are now per store,
// and the product in the deal needs to be a ResolvedProduct for that store.
// For seeding, we'll manually construct what a ResolvedProduct would look like.

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0); // Midnight tomorrow

const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(today.getDate() + 2);
dayAfterTomorrow.setHours(10,0,0,0); // 10 AM day after tomorrow

export const dailyDeals: Deal[] = [];

// Deal for "Indigo Haze Vape Pen" (prod_001) at "store_001"
const product1Core = initialProducts.find(p => p.id === 'prod_001');
if (product1Core) {
  const product1Store1Availability = product1Core.availability.find(a => a.storeId === 'store_001');
  if (product1Store1Availability) {
    const resolvedProduct1Store1: ResolvedProduct = {
      originalProductId: product1Core.id,
      name: product1Core.name,
      description: product1Core.description,
      brand: product1Core.brand,
      category: product1Core.category,
      dataAiHint: product1Core.dataAiHint,
      storeId: product1Store1Availability.storeId,
      price: product1Store1Availability.price,
      stock: product1Store1Availability.stock,
      imageUrl: product1Store1Availability.storeSpecificImageUrl || product1Core.baseImageUrl,
    };
    dailyDeals.push({
      id: 'deal_001',
      product: resolvedProduct1Store1,
      dealPrice: product1Store1Availability.price * 0.8, // Example 20% off
      expiresAt: tomorrow.toISOString(),
      title: 'Flash Sale: Indigo Haze!',
      description: `Get the popular ${product1Core.name} at a discounted price for a limited time at our Indianapolis store!`,
      storeId: 'store_001',
    });
  }
}

// Deal for "Violet Kush THCa Flower" (prod_002) at "store_002"
const product2Core = initialProducts.find(p => p.id === 'prod_002');
if (product2Core) {
  const product2Store2Availability = product2Core.availability.find(a => a.storeId === 'store_002');
  if (product2Store2Availability) {
    const resolvedProduct2Store2: ResolvedProduct = {
      originalProductId: product2Core.id,
      name: product2Core.name,
      description: product2Core.description,
      brand: product2Core.brand,
      category: product2Core.category,
      dataAiHint: product2Core.dataAiHint,
      storeId: product2Store2Availability.storeId,
      price: product2Store2Availability.price,
      stock: product2Store2Availability.stock,
      imageUrl: product2Store2Availability.storeSpecificImageUrl || product2Core.baseImageUrl,
    };
    dailyDeals.push({
      id: 'deal_002',
      product: resolvedProduct2Store2,
      dealPrice: product2Store2Availability.price * 0.9, // Example 10% off
      expiresAt: dayAfterTomorrow.toISOString(),
      title: 'THCa Special: Violet Kush',
      description: `Experience the quality of ${product2Core.name}, now on offer at our Fort Wayne store.`,
      storeId: 'store_002',
    });
  }
}
