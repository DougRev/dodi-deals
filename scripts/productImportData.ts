
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
  // === Flower (All Dodi Hemp) ===
  {
    name: "(LIMITED RELEASE) THCa Nugs - Purp Snow Balls",
    description: "Indica strain with potent THCa content. Deep purple hues and frosty trichomes.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower indica",
    isFeatured: true,
  },
  {
    name: "Exotic Indoor THCa Flower – RS11",
    description: "Hybrid strain known as \"Rainbow Sherbert #11.\" Balanced effects and vibrant colors.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
    isFeatured: true,
  },
  {
    name: "Exotic Indoor THCa Flower – Peanut Butter Breath",
    description: "Hybrid strain with a nutty and earthy terpene profile. Relaxing and euphoric.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
    isFeatured: false,
  },
  {
    name: "AAA Indoor THCa Flower - Jelly Runtz",
    description: "Hybrid strain offering a unique sweet and fruity experience. Potent and flavorful.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower hybrid",
    isFeatured: true,
  },
  {
    name: "AAA Indoor THCa Flower - Lemon Cherry Sherbert",
    description: "Hybrid strain bred by Cookies, combining Lemon Cherry Gelato and Sunset Sherbet. Marketed by Dodi Hemp.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower cookies",
    isFeatured: false,
  },
  {
    name: "$99 1 OZ THCa Flower - Special Mix",
    description: "Bulk option featuring a rotating mix of quality Dodi Hemp strains like Cherry Runtz, Fuelato, and Garfield.",
    category: "Flower",
    brand: "Dodi Hemp",
    dataAiHint: "flower bulk",
    isFeatured: false,
  },

  // === Pre-roll (All Dodi Hemp) ===
  {
    name: "2 Pack THCa Diamond Infused Prerolls",
    description: "Two premium pre-rolls infused with THCa diamonds for enhanced potency and a sparkling experience.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll diamond",
    isFeatured: true,
  },
  {
    name: "Dodi Hemp Classic Blunts - 2 Pack",
    description: "Traditional-style blunts made with Dodi Hemp's finest THCa flower. Slow burning and rich.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll blunt",
    isFeatured: false,
  },
  {
    name: "Hash Core Infused Prerolls - 3 Pack",
    description: "Three pre-rolls featuring a potent hash core for concentrated effects and a unique flavor.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll hash",
    isFeatured: false,
  },
  {
    name: "Kief Coated Mini Prerolls - 5 Pack",
    description: "Five mini pre-rolls expertly coated in kief for an extra layer of strength and aroma.",
    category: "Pre-roll",
    brand: "Dodi Hemp",
    dataAiHint: "preroll kief",
    isFeatured: false,
  },

  // === Vapes (Dodi Hemp & Other Brands) ===
  // Dodi Hemp Vapes
  {
    name: "Dodi Hemp 1 Gram Cartridge - Green Crack",
    description: "Sativa strain cartridge known for its energizing effects. Pure and potent.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape sativa",
    isFeatured: true,
  },
  {
    name: "Dodi Hemp 2 Gram Disposable - Grand Daddy Purp",
    description: "Indica strain disposable offering deep relaxation and a classic grape flavor.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape indica",
    isFeatured: false,
  },
  {
    name: "Dodi Hemp 2 Gram Disposable - Pineapple Express",
    description: "Sativa-dominant hybrid disposable with tropical flavors and uplifting effects.",
    category: "Vape",
    brand: "Dodi Hemp",
    dataAiHint: "vape sativa",
    isFeatured: true,
  },
  // Geek Bar Vapes
  {
    name: "Geek Bar Pulse - Watermelon Ice",
    description: "Popular disposable vape by Geek Bar featuring a refreshing Watermelon Ice flavor and long-lasting puffs.",
    category: "Vape",
    brand: "Geek Bar",
    dataAiHint: "vape disposable",
    isFeatured: true,
  },
  {
    name: "Geek Bar Pulse - Blue Razz Ice",
    description: "A tangy and cool Blue Razz Ice flavor from Geek Bar's Pulse line of disposables.",
    category: "Vape",
    brand: "Geek Bar",
    dataAiHint: "vape disposable",
    isFeatured: false,
  },
  // Mr. Fog Vapes
  {
    name: "Mr. Fog Switch SW15000 - Strawberry Dragonfruit",
    description: "Mr. Fog Switch disposable offering a blend of sweet strawberry and exotic dragonfruit.",
    category: "Vape",
    brand: "Mr. Fog",
    dataAiHint: "vape disposable",
    isFeatured: false,
  },
  {
    name: "Mr. Fog Max Air - Peach Pineapple Ice",
    description: "A refreshing mix of peach, pineapple, and ice in a high-capacity disposable from Mr. Fog.",
    category: "Vape",
    brand: "Mr. Fog",
    dataAiHint: "vape disposable",
    isFeatured: false,
  },
  // Fifty Bar Vapes
  {
    name: "Fifty Bar Disposable - Aloe Grape Watermelon",
    description: "A unique blend of aloe, grape, and watermelon in a convenient disposable by Fifty Bar.",
    category: "Vape",
    brand: "Fifty Bar",
    dataAiHint: "vape disposable",
    isFeatured: false,
  },
  
  // === E-Liquid ===
  {
    name: "Juice Head E-Liquid - Peach Pear (100ml)",
    description: "Classic Peach Pear e-liquid from Juice Head, perfect for vape mods. Available in various nicotine strengths.",
    category: "E-Liquid",
    brand: "Juice Head",
    dataAiHint: "eliquid peach",
    isFeatured: false,
  },
  {
    name: "Twist E-Liquids - Pink Punch Lemonade (60ml x2)",
    description: "Iconic Pink Punch Lemonade flavor from Twist E-Liquids, typically sold in dual 60ml bottles.",
    category: "E-Liquid",
    brand: "Twist",
    dataAiHint: "eliquid lemonade",
    isFeatured: false,
  },
  {
    name: "Squeeze E-Liquids - Green Apple (100ml)",
    description: "Crisp Green Apple e-liquid by Squeeze, delivering a tart and sweet vaping experience.",
    category: "E-Liquid",
    brand: "Squeeze",
    dataAiHint: "eliquid apple",
    isFeatured: false,
  },

  // === Edibles (Dodi Hemp & Other Brands) ===
  // Dodi Hemp Edibles
  {
    name: "Dodi Hemp Double Stack Gummies - Green Apple & Grape (5 Ct)",
    description: "Green Apple & Grape Live Resin gummies by Dodi Hemp, each delivering 250mg of potent cannabinoids.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy",
    isFeatured: true,
  },
  {
    name: "Dodi Hemp Rise & Shine Gummies - Citrus Blast (20 Ct)",
    description: "Each gummy contains 10mg Live Resin D9, 10mg CBG, and 5mg THCV for an uplifting experience.",
    category: "Edible",
    brand: "Dodi Hemp",
    dataAiHint: "edible gummy_rise",
    isFeatured: false,
  },
  // CannaElite Edibles
  {
    name: "CannaElite Delta-9 Gummies - Strawberry Fields (10 Ct)",
    description: "Delicious strawberry-flavored gummies infused with premium Delta-9 THC by CannaElite.",
    category: "Edible",
    brand: "CannaElite",
    dataAiHint: "edible gummy_delta9",
    isFeatured: true,
  },
  {
    name: "CannaElite Chocolate Bar - Dark Raspberry (100mg)",
    description: "Rich dark chocolate bar with raspberry notes, infused with 100mg THC by CannaElite.",
    category: "Edible",
    brand: "CannaElite",
    dataAiHint: "edible chocolate",
    isFeatured: false,
  },
  // Hidden Hills Edibles
  {
    name: "Hidden Hills Rizz Mix Gummies - Rainbow Belts (20 Ct)",
    description: "A vibrant mix of rainbow belt flavored gummies from Hidden Hills, known for their potent blends.",
    category: "Edible",
    brand: "Hidden Hills",
    dataAiHint: "edible gummy_rainbow",
    isFeatured: false,
  },
  {
    name: "Hidden Hills VVS Liquid Diamond Bar - Peach Mango (2g)",
    description: "A unique edible bar from Hidden Hills combining liquid diamonds with peach mango flavor.",
    category: "Edible",
    brand: "Hidden Hills",
    dataAiHint: "edible bar_diamond",
    isFeatured: false,
  },

  // === Concentrates (Dodi Hemp) ===
  {
    name: "Dodi Hemp THCa Diamonds + Sauce - Black Lime (2g)",
    description: "High-purity THCa diamonds suspended in rich terpene sauce. Black Lime strain for a zesty profile.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond_sauce",
    isFeatured: true,
  },
  {
    name: "Dodi Hemp Pure THCa Diamonds - Isolate (2g)",
    description: "Almost 99.9% pure THCa diamonds for maximum potency. Unflavored and versatile.",
    category: "Concentrate",
    brand: "Dodi Hemp",
    dataAiHint: "concentrate diamond",
    isFeatured: false,
  },

  // === Hemp Accessories ===
  {
    name: "Grav Labs Premium Glass Bong - Beaker Style",
    description: "High-quality borosilicate glass beaker bong by Grav Labs for a smooth experience.",
    category: "Hemp Accessory",
    brand: "Grav Labs",
    dataAiHint: "glass bong",
    isFeatured: true,
  },
  {
    name: "RAW Organic Rolling Papers - King Size Slim",
    description: "Unbleached organic hemp rolling papers by RAW, king size slim for the purist.",
    category: "Hemp Accessory",
    brand: "RAW",
    dataAiHint: "rolling papers",
    isFeatured: false,
  },
  {
    name: "Dodi Accessories 4-Piece Herb Grinder - Matte Black",
    description: "Durable aluminum herb grinder with kief catcher, featuring a sleek matte black Dodi design.",
    category: "Hemp Accessory",
    brand: "Dodi Accessories",
    dataAiHint: "herb grinder",
    isFeatured: false,
  },
  {
    name: "Artistic Design Rolling Tray - Galaxy Medium",
    description: "Medium sized rolling tray with a unique galaxy artistic design. Metal construction.",
    category: "Hemp Accessory",
    brand: "Generic Brand", 
    dataAiHint: "rolling tray",
    isFeatured: false,
  },
  {
    name: "Shine 24K Gold Rolling Papers - 2 Sheet Pack",
    description: "Luxury 24K gold rolling papers by Shine for a truly opulent experience.",
    category: "Hemp Accessory",
    brand: "Shine Papers",
    dataAiHint: "gold papers",
    isFeatured: false,
  },
];

    