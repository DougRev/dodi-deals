// scripts/productImportData.ts
import type { ProductCategory } from '@/lib/types';

export interface ProductImportEntry {
  name: string;
  description: string;
  category: ProductCategory;
  brand: string;
  dataAiHint: string;
}

export const productsToImport: ProductImportEntry[] = [
  // THCa Flower
  {
    name: "(LIMITED RELEASE) THCa Nugs - Purp Snow Balls",
    description: "Indica strain with potent THCa content.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower indica",
  },
  {
    name: "Exotic Indoor THCa Flower – RS11",
    description: "Hybrid strain known as \"Rainbow Sherbert #11.\"",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
  },
  {
    name: "Exotic Indoor THCa Flower – Peanut Butter Breath",
    description: "Hybrid strain with a nutty and earthy terpene profile.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
  },
  {
    name: "AAA Indoor THCa Flower - Jelly Runtz",
    description: "Hybrid strain offering a unique experience.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
  },
  {
    name: "AAA Indoor THCa Flower - Lemon Cherry Sherbert",
    description: "Hybrid strain bred by Cookies, combining Lemon Cherry Gelato and Sunset Sherbet.",
    category: "Flower",
    brand: "Cookies",
    dataAiHint: "flower cookies",
  },
  {
    name: "$99 1 OZ THCa Flower",
    description: "Bulk option featuring strains like Cherry Runtz, Fuelato, and Garfield.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower bulk",
  },

  // THCa Prerolls
  {
    name: "2 Pack THCa Diamond Infused Prerolls",
    description: "Pre-rolls infused with THCa diamonds for enhanced potency.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll diamond",
  },
  {
    name: "Blunts",
    description: "Traditional-style blunts made with THCa flower.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll blunt",
  },
  {
    name: "Hash Core Prerolls",
    description: "Pre-rolls featuring a hash core for concentrated effects.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll hash",
  },
  {
    name: "Kief Coated Mini Prerolls",
    description: "Mini pre-rolls coated in kief for added strength.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll kief",
  },
  {
    name: "Mini Prerolls",
    description: "Smaller-sized pre-rolls for convenience.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll mini",
  },
  {
    name: "Single Prerolls",
    description: "Individual pre-rolls for single-use sessions.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll single",
  },
  {
    name: "Snow Coated Mini Prerolls",
    description: "Mini pre-rolls coated with THCa isolate for maximum potency.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll snow",
  },

  // Cartridges (Mapped to Vape)
  {
    name: "1 Gram Cartridge - Green Crack",
    description: "Sativa strain known for its energizing effects.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape sativa",
  },
  {
    name: "1 Gram Cartridge - Forbidden Fruit",
    description: "Indica-dominant hybrid with a fruity flavor profile.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape indica",
  },
  {
    name: "1 Gram Cartridge - Sour Lemon Mac",
    description: "Hybrid strain offering a citrusy taste.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "1 Gram Cartridge - Grapes N Cream",
    description: "Hybrid strain with sweet and creamy notes.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "1 Gram Cartridge - Black Lime",
    description: "Unique strain with a blend of citrus and earthy flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "1 Gram Cartridge - Banana Runtz",
    description: "Hybrid strain combining banana and candy flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },

  // Disposables (Mapped to Vape)
  {
    name: "2 Gram Disposable - Grand Daddy Purp",
    description: "Indica strain offering relaxation.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape indica",
  },
  {
    name: "2 Gram Disposable - Sour Lemon Mac",
    description: "Hybrid strain with a sour citrus profile.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "2 Gram Disposable - Black Lime",
    description: "Distinctive flavor combining citrus and spice.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "2 Gram Disposable - Zlushiez",
    description: "Live Resin Delta 8 disposable with a unique terpene blend.",
    category: "Vape",
    brand: "Dodi Live Resin", // Differentiating Delta 8
    dataAiHint: "vape live_resin",
  },
  {
    name: "2 Gram Disposable - White Truffle",
    description: "Live Resin Delta 8 disposable offering earthy flavors.",
    category: "Vape",
    brand: "Dodi Live Resin", // Differentiating Delta 8
    dataAiHint: "vape live_resin",
  },
  {
    name: "2 Gram Disposable - Jenny Kush",
    description: "Hybrid strain providing balanced effects.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
  },
  {
    name: "2 Gram Disposable - Slap Cakes",
    description: "Live Resin Delta 8 disposable with a sweet profile.",
    category: "Vape",
    brand: "Dodi Live Resin", // Differentiating Delta 8
    dataAiHint: "vape live_resin",
  },
  {
    name: "2 Gram Disposable - Jelly Doughnutz",
    description: "THCa disposable combining sweet flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape thca",
  },
  {
    name: "2 Gram Disposable - Pineapple Express",
    description: "Sativa-dominant hybrid with tropical flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape sativa",
  },
  {
    name: "2 Gram Disposable - Lemon Cherry Gelato",
    description: "Live Resin Delta 8 disposable with citrus and cherry notes.",
    category: "Vape",
    brand: "Dodi Live Resin", // Differentiating Delta 8
    dataAiHint: "vape live_resin",
  },
  {
    name: "2 Gram Disposable - dodi Berry",
    description: "Live Resin Delta 8 disposable featuring berry flavors.",
    category: "Vape",
    brand: "Dodi Live Resin", // Differentiating Delta 8
    dataAiHint: "vape berry",
  },

  // Edibles
  {
    name: "Double Stack Gummies - 5 Ct Jar",
    description: "Green Apple & Grape Live Resin gummies, each delivering 250mg of THC.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy",
  },
  {
    name: "High Potency + Diamonds Gummies Starblast - 10 Ct Jar",
    description: "Gummies containing Delta 8, Delta 9 Live Resin, THCa, and THCP.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_diamond",
  },
  {
    name: "High Potency + Diamonds Gummies Sour Zaps - 10 Ct Jar",
    description: "Similar blend with a sour flavor profile.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_sour",
  },
  {
    name: "High Potency + Diamonds Gummies Purple Punch - 10 Ct Jar",
    description: "Gummies with a grape-inspired flavor.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_grape",
  },
  {
    name: "Rise & Shine Gummies - 20 Ct Jar",
    description: "Each gummy contains 10mg Live Resin D9, 10mg CBG, and 5mg THCV for an uplifting experience.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_rise",
  },

  // Tinctures (Mapped to Concentrate)
  {
    name: "Tincture - Rise & Shine",
    description: "30ml blend with 10mg THCa, 10mg CBD, and 5mg THCV per 1ml dose, designed to energize your mornings.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "tincture rise",
  },
  {
    name: "Tincture - Knockout",
    description: "30ml blend delivering 10mg THCa, 10mg CBD, and 5mg CBN per 1ml dose, formulated for relaxation.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "tincture knockout",
  },

  // Concentrates
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Black Lime",
    description: "High-purity concentrate for dabbing enthusiasts.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
  },
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Banana Runtz",
    description: "Concentrate offering a sweet and fruity profile.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
  },
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Grapes N Cream",
    description: "Blend delivering creamy grape flavors.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
  },
  {
    name: "THCa Diamonds - 99.9% THCa - 2 Gram",
    description: "Pure THCa diamonds for potent effects.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond",
  },
];