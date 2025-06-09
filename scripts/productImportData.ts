
// scripts/productImportData.ts
import type { ProductCategory } from '@/lib/types';

export interface ProductImportEntry {
  name: string;
  description: string;
  category: ProductCategory;
  brand: string;
  dataAiHint: string;
  isFeatured?: boolean;
}

export const productsToImport: ProductImportEntry[] = [
  // THCa Flower - All should be Dodi Hemp
  {
    name: "(LIMITED RELEASE) THCa Nugs - Purp Snow Balls",
    description: "Indica strain with potent THCa content.",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced
    dataAiHint: "flower indica",
    isFeatured: true,
  },
  {
    name: "Exotic Indoor THCa Flower – RS11",
    description: "Hybrid strain known as \"Rainbow Sherbert #11.\"",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced
    dataAiHint: "flower hybrid",
    isFeatured: true,
  },
  {
    name: "Exotic Indoor THCa Flower – Peanut Butter Breath",
    description: "Hybrid strain with a nutty and earthy terpene profile.",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced
    dataAiHint: "flower hybrid",
    isFeatured: false,
  },
  {
    name: "AAA Indoor THCa Flower - Jelly Runtz",
    description: "Hybrid strain offering a unique experience.",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced
    dataAiHint: "flower hybrid",
    isFeatured: true,
  },
  {
    name: "AAA Indoor THCa Flower - Lemon Cherry Sherbert",
    description: "Hybrid strain bred by Cookies, combining Lemon Cherry Gelato and Sunset Sherbet. Marketed by Dodi Hemp.",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced (Assuming Dodi Hemp is the retailer/brand for this app context)
    dataAiHint: "flower cookies", // Keep hint for image search if needed
    isFeatured: false,
  },
  {
    name: "$99 1 OZ THCa Flower",
    description: "Bulk option featuring strains like Cherry Runtz, Fuelato, and Garfield under the Dodi Hemp brand.",
    category: "Flower",
    brand: "Dodi Hemp", // Enforced
    dataAiHint: "flower bulk",
    isFeatured: false,
  },

  // THCa Prerolls
  {
    name: "2 Pack THCa Diamond Infused Prerolls",
    description: "Pre-rolls infused with THCa diamonds for enhanced potency.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll diamond",
    isFeatured: true,
  },
  {
    name: "Blunts",
    description: "Traditional-style blunts made with THCa flower.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll blunt",
    isFeatured: false,
  },
  {
    name: "Hash Core Prerolls",
    description: "Pre-rolls featuring a hash core for concentrated effects.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll hash",
    isFeatured: false,
  },
  {
    name: "Kief Coated Mini Prerolls",
    description: "Mini pre-rolls coated in kief for added strength.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll kief",
    isFeatured: false,
  },
  {
    name: "Mini Prerolls",
    description: "Smaller-sized pre-rolls for convenience.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll mini",
    isFeatured: false,
  },
  {
    name: "Single Prerolls",
    description: "Individual pre-rolls for single-use sessions.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll single",
    isFeatured: false,
  },
  {
    name: "Snow Coated Mini Prerolls",
    description: "Mini pre-rolls coated with THCa isolate for maximum potency.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll snow",
    isFeatured: false,
  },

  // Cartridges (Mapped to Vape)
  {
    name: "1 Gram Cartridge - Green Crack",
    description: "Sativa strain known for its energizing effects.",
    category: "Vape",
    brand: "Dodi Hemp", // Using Dodi Hemp, can be changed if it's a 3rd party brand
    dataAiHint: "vape sativa",
    isFeatured: true,
  },
  {
    name: "1 Gram Cartridge - Forbidden Fruit",
    description: "Indica-dominant hybrid with a fruity flavor profile.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape indica",
    isFeatured: false,
  },
  {
    name: "1 Gram Cartridge - Sour Lemon Mac",
    description: "Hybrid strain offering a citrusy taste.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "1 Gram Cartridge - Grapes N Cream",
    description: "Hybrid strain with sweet and creamy notes.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "1 Gram Cartridge - Black Lime",
    description: "Unique strain with a blend of citrus and earthy flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "1 Gram Cartridge - Banana Runtz",
    description: "Hybrid strain combining banana and candy flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },

  // Disposables (Mapped to Vape)
  {
    name: "2 Gram Disposable - Grand Daddy Purp",
    description: "Indica strain offering relaxation.",
    category: "Vape",
    brand: "Dodi Hemp", // Assuming Dodi Hemp brand for these
    dataAiHint: "vape indica",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Sour Lemon Mac",
    description: "Hybrid strain with a sour citrus profile.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Black Lime",
    description: "Distinctive flavor combining citrus and spice.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Zlushiez",
    description: "Live Resin Delta 8 disposable with a unique terpene blend.",
    category: "Vape",
    brand: "Dodi Hemp", // Changed from Dodi Live Resin to Dodi Hemp for consistency or can be its own if needed
    dataAiHint: "vape live_resin",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - White Truffle",
    description: "Live Resin Delta 8 disposable offering earthy flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape live_resin",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Jenny Kush",
    description: "Hybrid strain providing balanced effects.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape hybrid",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Slap Cakes",
    description: "Live Resin Delta 8 disposable with a sweet profile.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape live_resin",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - Jelly Doughnutz",
    description: "THCa disposable combining sweet flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape thca",
    isFeatured: true,
  },
  {
    name: "2 Gram Disposable - Pineapple Express",
    description: "Sativa-dominant hybrid with tropical flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape sativa",
    isFeatured: true,
  },
  {
    name: "2 Gram Disposable - Lemon Cherry Gelato",
    description: "Live Resin Delta 8 disposable with citrus and cherry notes.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape live_resin",
    isFeatured: false,
  },
  {
    name: "2 Gram Disposable - dodi Berry",
    description: "Live Resin Delta 8 disposable featuring berry flavors.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape berry",
    isFeatured: false,
  },

  // Edibles
  {
    name: "Double Stack Gummies - 5 Ct Jar",
    description: "Green Apple & Grape Live Resin gummies, each delivering 250mg of THC.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy",
    isFeatured: true,
  },
  {
    name: "High Potency + Diamonds Gummies Starblast - 10 Ct Jar",
    description: "Gummies containing Delta 8, Delta 9 Live Resin, THCa, and THCP.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_diamond",
    isFeatured: false,
  },
  {
    name: "High Potency + Diamonds Gummies Sour Zaps - 10 Ct Jar",
    description: "Similar blend with a sour flavor profile.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_sour",
    isFeatured: false,
  },
  {
    name: "High Potency + Diamonds Gummies Purple Punch - 10 Ct Jar",
    description: "Gummies with a grape-inspired flavor.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_grape",
    isFeatured: false,
  },
  {
    name: "Rise & Shine Gummies - 20 Ct Jar",
    description: "Each gummy contains 10mg Live Resin D9, 10mg CBG, and 5mg THCV for an uplifting experience.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_rise",
    isFeatured: false,
  },

  // Tinctures (Mapped to Concentrate)
  {
    name: "Tincture - Rise & Shine",
    description: "30ml blend with 10mg THCa, 10mg CBD, and 5mg THCV per 1ml dose, designed to energize your mornings.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "tincture rise",
    isFeatured: false,
  },
  {
    name: "Tincture - Knockout",
    description: "30ml blend delivering 10mg THCa, 10mg CBD, and 5mg CBN per 1ml dose, formulated for relaxation.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "tincture knockout",
    isFeatured: false,
  },

  // Concentrates
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Black Lime",
    description: "High-purity concentrate for dabbing enthusiasts.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
    isFeatured: true,
  },
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Banana Runtz",
    description: "Concentrate offering a sweet and fruity profile.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
    isFeatured: false,
  },
  {
    name: "THCa Diamonds + Sauce - 2 Gram - Grapes N Cream",
    description: "Blend delivering creamy grape flavors.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
    isFeatured: false,
  },
  {
    name: "THCa Diamonds - 99.9% THCa - 2 Gram",
    description: "Pure THCa diamonds for potent effects.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond",
    isFeatured: false,
  },

  // Hemp Accessories
  {
    name: "Premium Glass Bong",
    description: "High-quality borosilicate glass bong for a smooth experience.",
    category: "Hemp Accessory",
    brand: "Grav Labs", // Example actual brand
    dataAiHint: "glass bong",
    isFeatured: true,
  },
  {
    name: "Organic Rolling Papers - King Size",
    description: "Unbleached organic hemp rolling papers, king size.",
    category: "Hemp Accessory",
    brand: "RAW", // Example actual brand
    dataAiHint: "rolling papers",
    isFeatured: false,
  },
  {
    name: "4-Piece Herb Grinder - Aluminum",
    description: "Durable aluminum herb grinder with kief catcher.",
    category: "Hemp Accessory",
    brand: "Dodi Accessories",
    dataAiHint: "herb grinder",
    isFeatured: false,
  },
  {
    name: "Artistic Rolling Tray - Medium",
    description: "Medium sized rolling tray with unique artistic design.",
    category: "Hemp Accessory",
    brand: "Generic Brand", // Example for less specific brand
    dataAiHint: "rolling tray",
    isFeatured: false,
  },
];
