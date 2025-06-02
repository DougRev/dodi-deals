
import type { Store } from '@/lib/types';

export const initialStores: Store[] = [
  {
    id: 'store_001',
    name: 'Dodi Deals - Indianapolis',
    address: '123 Main St',
    city: 'Indianapolis, IN',
    hours: 'Mon-Sat: 9am - 9pm, Sun: 10am - 6pm',
    dailyDeals: [], // Initialize with empty array for custom deal rules
  },
  {
    id: 'store_002',
    name: 'Dodi Deals - Fort Wayne',
    address: '456 Oak Ave',
    city: 'Fort Wayne, IN',
    hours: 'Mon-Sat: 10am - 8pm, Sun: 11am - 5pm',
    dailyDeals: [], // Initialize with empty array for custom deal rules
  },
  {
    id: 'store_003',
    name: 'Dodi Deals - Evansville',
    address: '789 Pine Rd',
    city: 'Evansville, IN',
    hours: 'Mon-Fri: 9am - 7pm, Sat: 10am - 6pm, Sun: Closed',
    dailyDeals: [], // Initialize with empty array for custom deal rules
  },
];
