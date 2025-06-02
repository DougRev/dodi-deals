
import type { Deal, ResolvedProduct } from '@/lib/types';
// import { initialProducts } from './products'; // No longer needed here for static deals

// This seed data for specific product deals is now superseded by dynamic category-based deals
// generated in AppContext. This array is kept for structure but should be empty
// as AppContext will populate deals based on store settings and current day.

export const dailyDeals: Deal[] = [];
