import type { ProductMetadataValueType } from "../models/ProductMetadataField.js";

export type DemoFieldDef = {
  key: string;
  label: string;
  valueType: ProductMetadataValueType;
  unit?: string;
  options?: string[];
  sortOrder: number;
};

export type DemoTypeDef = {
  name: string;
  description: string;
  sortOrder: number;
  fields: DemoFieldDef[];
};

export type DemoProductDef = {
  typeName: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  metadata: Record<string, string>;
  trackInventory?: boolean;
  expiryDaysFromNow?: number;
  discountType?: "NONE" | "PERCENT" | "FIXED";
  discountValue?: number;
};

export const DEMO_PRODUCT_TYPES: DemoTypeDef[] = [
  {
    name: "Soft Drinks & Water",
    description: "Carbonated drinks, juices, bottled water, energy drinks",
    sortOrder: 0,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "size", label: "Size label", valueType: "TEXT", sortOrder: 1 },
      { key: "volume_ml", label: "Volume", valueType: "NUMBER", unit: "ml", sortOrder: 2 },
      {
        key: "packaging",
        label: "Packaging",
        valueType: "SELECT",
        options: ["Bottle", "Can", "PET", "Glass", "Carton"],
        sortOrder: 3,
      },
      { key: "flavour", label: "Flavour", valueType: "TEXT", sortOrder: 4 },
    ],
  },
  {
    name: "Beer, Wine & Spirits",
    description: "Alcoholic beverages",
    sortOrder: 1,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "abv", label: "Alcohol by volume", valueType: "NUMBER", unit: "%", sortOrder: 1 },
      { key: "volume_ml", label: "Volume", valueType: "NUMBER", unit: "ml", sortOrder: 2 },
      {
        key: "style",
        label: "Style",
        valueType: "SELECT",
        options: ["Lager", "Stout", "Red wine", "White wine", "Spirit", "Cider"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Snacks & Chips",
    description: "Crisps, nuts, crackers, savoury snacks",
    sortOrder: 2,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "weight_g", label: "Net weight", valueType: "NUMBER", unit: "g", sortOrder: 1 },
      {
        key: "flavour",
        label: "Flavour",
        valueType: "SELECT",
        options: ["Plain", "Cheese", "BBQ", "Spicy", "Salt & vinegar", "Sweet"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Candy & Chocolate",
    description: "Confectionery and chocolate bars",
    sortOrder: 3,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "weight_g", label: "Net weight", valueType: "NUMBER", unit: "g", sortOrder: 1 },
      {
        key: "type",
        label: "Type",
        valueType: "SELECT",
        options: ["Bar", "Bag", "Box", "Biscuit", "Gum"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Rice, Pasta & Grains",
    description: "Dry staples and cereals",
    sortOrder: 4,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "weight_kg", label: "Pack size", valueType: "NUMBER", unit: "kg", sortOrder: 1 },
      {
        key: "grain",
        label: "Grain type",
        valueType: "SELECT",
        options: ["Long grain rice", "Basmati", "Jasmine", "Pasta", "Oats", "Maize meal"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Canned & Jarred",
    description: "Tinned vegetables, sauces, soups",
    sortOrder: 5,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "weight_g", label: "Drained weight", valueType: "NUMBER", unit: "g", sortOrder: 1 },
      { key: "contents", label: "Contents", valueType: "TEXT", sortOrder: 2 },
    ],
  },
  {
    name: "Bakery & Bread",
    description: "Fresh and packaged bakery",
    sortOrder: 6,
    fields: [
      {
        key: "baked",
        label: "Baked",
        valueType: "SELECT",
        options: ["Fresh today", "Packaged", "Frozen"],
        sortOrder: 0,
      },
      { key: "weight_g", label: "Weight", valueType: "NUMBER", unit: "g", sortOrder: 1 },
      { key: "allergens", label: "Allergens", valueType: "TEXT", sortOrder: 2 },
    ],
  },
  {
    name: "Dairy & Eggs",
    description: "Milk, yogurt, cheese, eggs",
    sortOrder: 7,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "volume_ml", label: "Volume", valueType: "NUMBER", unit: "ml", sortOrder: 1 },
      {
        key: "fat",
        label: "Fat content",
        valueType: "SELECT",
        options: ["Full cream", "Semi-skimmed", "Skimmed", "N/A"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Fresh Produce",
    description: "Fruit and vegetables",
    sortOrder: 8,
    fields: [
      { key: "origin", label: "Origin", valueType: "TEXT", sortOrder: 0 },
      {
        key: "sold_by",
        label: "Sold by",
        valueType: "SELECT",
        options: ["Each", "Kg", "Bunch", "Punnet"],
        sortOrder: 1,
      },
      {
        key: "organic",
        label: "Organic",
        valueType: "SELECT",
        options: ["Yes", "No"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Personal Care",
    description: "Soap, shampoo, toothpaste, deodorant",
    sortOrder: 9,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "size", label: "Size", valueType: "TEXT", sortOrder: 1 },
      {
        key: "category",
        label: "Category",
        valueType: "SELECT",
        options: ["Hair", "Skin", "Oral", "Bath", "Men's grooming"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Cosmetics & Beauty",
    description: "Makeup, fragrance, skincare treatments",
    sortOrder: 10,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "shade", label: "Shade / variant", valueType: "TEXT", sortOrder: 1 },
      {
        key: "product_kind",
        label: "Product kind",
        valueType: "SELECT",
        options: ["Lipstick", "Foundation", "Mascara", "Perfume", "Lotion", "Serum"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Household & Cleaning",
    description: "Detergents, paper goods, batteries",
    sortOrder: 11,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      { key: "size", label: "Size / count", valueType: "TEXT", sortOrder: 1 },
      {
        key: "use",
        label: "Use",
        valueType: "SELECT",
        options: ["Laundry", "Dishes", "Surface", "Toilet", "Paper", "Batteries"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Electronics & Accessories",
    description: "Cables, chargers, headphones, small gadgets",
    sortOrder: 12,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT", sortOrder: 0 },
      {
        key: "connector",
        label: "Connector",
        valueType: "SELECT",
        options: ["USB-C", "Lightning", "Micro-USB", "3.5mm", "HDMI", "N/A"],
        sortOrder: 1,
      },
      { key: "colour", label: "Colour", valueType: "TEXT", sortOrder: 2 },
    ],
  },
];

function p(
  typeName: string,
  name: string,
  sku: string,
  price: number,
  metadata: Record<string, string>,
  extra?: Partial<DemoProductDef>,
): DemoProductDef {
  const cost = extra?.cost ?? Math.round(price * 0.65 * 100) / 100;
  return {
    typeName,
    name,
    sku,
    price,
    cost,
    metadata,
    trackInventory: extra?.trackInventory ?? true,
    ...extra,
  };
}

/** Expanded product list (~130 SKUs) for a general retail shop. */
export function buildDemoProducts(): DemoProductDef[] {
  const out: DemoProductDef[] = [];

  const drinks = [
    ["Coca-Cola Original", "CC-330-CAN", 5.5, { brand: "Coca-Cola", size: "330ml", volume_ml: "330", packaging: "Can", flavour: "Cola" }],
    ["Coca-Cola Zero", "CCZ-330-CAN", 5.5, { brand: "Coca-Cola", size: "330ml", volume_ml: "330", packaging: "Can", flavour: "Cola zero" }],
    ["Pepsi", "PEP-330-CAN", 5.0, { brand: "Pepsi", size: "330ml", volume_ml: "330", packaging: "Can", flavour: "Cola" }],
    ["Fanta Orange", "FAN-330-CAN", 5.0, { brand: "Fanta", size: "330ml", volume_ml: "330", packaging: "Can", flavour: "Orange" }],
    ["Sprite", "SPR-330-CAN", 5.0, { brand: "Sprite", size: "330ml", volume_ml: "330", packaging: "Can", flavour: "Lemon-lime" }],
    ["Voltic Water 500ml", "VOL-500-PET", 3.0, { brand: "Voltic", size: "500ml", volume_ml: "500", packaging: "PET", flavour: "Still" }],
    ["Voltic Water 1.5L", "VOL-1500-PET", 6.0, { brand: "Voltic", size: "1.5L", volume_ml: "1500", packaging: "PET", flavour: "Still" }],
    ["Bel Aqua 750ml", "BEL-750-PET", 4.0, { brand: "Bel Aqua", size: "750ml", volume_ml: "750", packaging: "PET", flavour: "Still" }],
    ["Tropical Mango Juice 1L", "TMJ-1L-CAR", 12.0, { brand: "Tropical", size: "1L", volume_ml: "1000", packaging: "Carton", flavour: "Mango" }],
    ["Ceremony Orange Juice 1L", "COJ-1L-CAR", 11.5, { brand: "Ceremony", size: "1L", volume_ml: "1000", packaging: "Carton", flavour: "Orange" }],
    ["Red Bull Energy 250ml", "RB-250-CAN", 18.0, { brand: "Red Bull", size: "250ml", volume_ml: "250", packaging: "Can", flavour: "Energy" }],
    ["Lucozade Boost 500ml", "LUC-500-PET", 9.0, { brand: "Lucozade", size: "500ml", volume_ml: "500", packaging: "PET", flavour: "Original" }],
    ["Coca-Cola 1.5L PET", "CC-1500-PET", 14.0, { brand: "Coca-Cola", size: "1.5L", volume_ml: "1500", packaging: "PET", flavour: "Cola" }],
    ["Alvaro Non-alcoholic Malt", "ALV-330-BTL", 6.5, { brand: "Alvaro", size: "330ml", volume_ml: "330", packaging: "Bottle", flavour: "Malt" }],
    ["Minute Maid Pulpy 400ml", "MM-400-PET", 8.0, { brand: "Minute Maid", size: "400ml", volume_ml: "400", packaging: "PET", flavour: "Orange pulp" }],
  ] as const;
  for (const [name, sku, price, meta] of drinks) {
    out.push(p("Soft Drinks & Water", name, sku, price, { ...meta }));
  }

  const alcohol = [
    ["Club Beer Lager 625ml", "CLB-625-BTL", 12.0, { brand: "Club Beer", abv: "5", volume_ml: "625", style: "Lager" }],
    ["Guinness Foreign Extra 625ml", "GUI-625-BTL", 14.0, { brand: "Guinness", abv: "7.5", volume_ml: "625", style: "Stout" }],
    ["Star Lager 625ml", "STL-625-BTL", 11.0, { brand: "Star", abv: "5.5", volume_ml: "625", style: "Lager" }],
    ["Savanna Dry Cider 330ml", "SAV-330-BTL", 13.0, { brand: "Savanna", abv: "6", volume_ml: "330", style: "Cider" }],
    ["Four Cousins Red Wine 750ml", "FC-R-750", 45.0, { brand: "Four Cousins", abv: "12", volume_ml: "750", style: "Red wine" }],
    ["Nederburg White 750ml", "NED-W-750", 55.0, { brand: "Nederburg", abv: "12.5", volume_ml: "750", style: "White wine" }],
    ["Johnnie Walker Red 750ml", "JW-R-750", 120.0, { brand: "Johnnie Walker", abv: "40", volume_ml: "750", style: "Spirit" }],
    ["Smirnoff Vodka 750ml", "SMV-750", 85.0, { brand: "Smirnoff", abv: "37.5", volume_ml: "750", style: "Spirit" }],
  ] as const;
  for (const [name, sku, price, meta] of alcohol) {
    out.push(p("Beer, Wine & Spirits", name, sku, price, { ...meta }));
  }

  const snacks = [
    ["Lay's Classic 45g", "LAY-45", 8.0, { brand: "Lay's", weight_g: "45", flavour: "Plain" }],
    ["Lay's Cheese 45g", "LAY-CH-45", 8.0, { brand: "Lay's", weight_g: "45", flavour: "Cheese" }],
    ["Pringles Original 40g", "PRG-40", 15.0, { brand: "Pringles", weight_g: "40", flavour: "Plain" }],
    ["Plantain Chips Spicy 150g", "PLC-SP-150", 10.0, { brand: "Local", weight_g: "150", flavour: "Spicy" }],
    ["Cashew Nuts Roasted 200g", "CSH-200", 25.0, { brand: "Premium", weight_g: "200", flavour: "Plain" }],
    ["Peanuts Salted 250g", "PNT-250", 12.0, { brand: "Market", weight_g: "250", flavour: "Salt & vinegar" }],
    ["Doritos Nacho 85g", "DOR-85", 18.0, { brand: "Doritos", weight_g: "85", flavour: "Cheese" }],
    ["Oreo Mini Bites 80g", "ORE-M-80", 14.0, { brand: "Oreo", weight_g: "80", flavour: "Sweet" }],
  ] as const;
  for (const [name, sku, price, meta] of snacks) {
    out.push(p("Snacks & Chips", name, sku, price, { ...meta }));
  }

  const candy = [
    ["Cadbury Dairy Milk 45g", "CDM-45", 7.0, { brand: "Cadbury", weight_g: "45", type: "Bar" }],
    ["Snickers 48g", "SNK-48", 7.5, { brand: "Snickers", weight_g: "48", type: "Bar" }],
    ["Mars 51g", "MRS-51", 7.5, { brand: "Mars", weight_g: "51", type: "Bar" }],
    ["Ferrero Rocher 3-pack", "FER-3", 22.0, { brand: "Ferrero", weight_g: "37", type: "Box" }],
    ["Haribo Goldbears 100g", "HAR-100", 18.0, { brand: "Haribo", weight_g: "100", type: "Bag" }],
    ["Trolli Sour Worms 120g", "TRL-120", 16.0, { brand: "Trolli", weight_g: "120", type: "Bag" }],
    ["Digestive Biscuits 400g", "DIG-400", 22.0, { brand: "McVitie's", weight_g: "400", type: "Biscuit" }],
    ["Trident Spearmint Gum", "TRI-GUM", 5.0, { brand: "Trident", weight_g: "14", type: "Gum" }],
  ] as const;
  for (const [name, sku, price, meta] of candy) {
    out.push(p("Candy & Chocolate", name, sku, price, { ...meta }));
  }

  const grains = [
    ["Gino Rice 1kg", "GIN-R-1", 18.0, { brand: "Gino", weight_kg: "1", grain: "Long grain rice" }],
    ["Tilda Basmati 1kg", "TIL-B-1", 45.0, { brand: "Tilda", weight_kg: "1", grain: "Basmati" }],
    ["Royal Jasmine 2kg", "ROY-J-2", 55.0, { brand: "Royal", weight_kg: "2", grain: "Jasmine" }],
    ["Barilla Spaghetti 500g", "BAR-S-500", 28.0, { brand: "Barilla", weight_kg: "0.5", grain: "Pasta" }],
    ["Quaker Oats 500g", "QUA-O-500", 32.0, { brand: "Quaker", weight_kg: "0.5", grain: "Oats" }],
    ["Maize Meal 2kg", "MM-2", 25.0, { brand: "Local Mill", weight_kg: "2", grain: "Maize meal" }],
    ["Couscous 500g", "COU-500", 20.0, { brand: "Safi", weight_kg: "0.5", grain: "Pasta" }],
  ] as const;
  for (const [name, sku, price, meta] of grains) {
    out.push(p("Rice, Pasta & Grains", name, sku, price, { ...meta }));
  }

  const canned = [
    ["Heinz Baked Beans 415g", "HEZ-BB-415", 18.0, { brand: "Heinz", weight_g: "415", contents: "Baked beans" }],
    ["Tinned Tomatoes 400g", "TT-400", 12.0, { brand: "Crown", weight_g: "400", contents: "Chopped tomatoes" }],
    ["Sweet Corn 340g", "SC-340", 11.0, { brand: "Green Giant", weight_g: "340", contents: "Sweet corn" }],
    ["Tuna Chunks in Brine 185g", "TUN-185", 22.0, { brand: "John West", weight_g: "185", contents: "Tuna" }],
    ["Tomato Paste 70g", "TP-70", 5.0, { brand: "Tasty Tom", weight_g: "70", contents: "Tomato paste" }],
    ["Chicken Soup 400g", "CS-400", 14.0, { brand: "Knorr", weight_g: "400", contents: "Chicken soup" }],
  ] as const;
  for (const [name, sku, price, meta] of canned) {
    out.push(p("Canned & Jarred", name, sku, price, { ...meta }, { expiryDaysFromNow: 365 }));
  }

  const bakery = [
    ["White Sandwich Loaf", "BRD-WHT", 14.0, { baked: "Fresh today", weight_g: "700", allergens: "Gluten" }],
    ["Brown Bread Loaf", "BRD-BRN", 15.0, { baked: "Fresh today", weight_g: "700", allergens: "Gluten" }],
    ["Baguette", "BRD-BAG", 8.0, { baked: "Fresh today", weight_g: "250", allergens: "Gluten" }],
    ["Croissant Butter", "BRD-CRO", 6.0, { baked: "Fresh today", weight_g: "60", allergens: "Gluten, dairy" }],
    ["Meat Pie", "BRD-PIE", 10.0, { baked: "Fresh today", weight_g: "180", allergens: "Gluten" }],
    ["Digestive Roll 6-pack", "BRD-DR-6", 12.0, { baked: "Packaged", weight_g: "300", allergens: "Gluten" }],
  ] as const;
  for (const [name, sku, price, meta] of bakery) {
    out.push(p("Bakery & Bread", name, sku, price, { ...meta }, { expiryDaysFromNow: 3 }));
  }

  const dairy = [
    ["Fresh Milk 1L", "MLK-1L", 18.0, { brand: "Cowbell", volume_ml: "1000", fat: "Full cream" }],
    ["Low Fat Milk 1L", "MLK-LF-1L", 18.0, { brand: "Cowbell", volume_ml: "1000", fat: "Semi-skimmed" }],
    ["Greek Yogurt 500g", "YOG-GR-500", 22.0, { brand: "Danone", volume_ml: "500", fat: "Full cream" }],
    ["Cheddar Block 200g", "CHD-200", 28.0, { brand: "Arla", volume_ml: "200", fat: "N/A" }],
    ["Eggs Tray 30", "EGG-30", 45.0, { brand: "Farm fresh", volume_ml: "0", fat: "N/A" }],
    ["Margarine 500g", "MRG-500", 16.0, { brand: "Blue Band", volume_ml: "500", fat: "N/A" }],
    ["Long Life Milk 1L", "MLK-UHT-1", 17.0, { brand: "Nido", volume_ml: "1000", fat: "Full cream" }],
  ] as const;
  for (const [name, sku, price, meta] of dairy) {
    out.push(p("Dairy & Eggs", name, sku, price, { ...meta }, { expiryDaysFromNow: 14 }));
  }

  const produce = [
    ["Banana (kg)", "PRO-BAN-KG", 8.0, { origin: "Ghana", sold_by: "Kg", organic: "No" }],
    ["Plantain (kg)", "PRO-PLT-KG", 10.0, { origin: "Ghana", sold_by: "Kg", organic: "No" }],
    ["Tomato (kg)", "PRO-TOM-KG", 15.0, { origin: "Local", sold_by: "Kg", organic: "No" }],
    ["Onion (kg)", "PRO-ON-KG", 12.0, { origin: "Local", sold_by: "Kg", organic: "No" }],
    ["Avocado each", "PRO-AVO-EA", 6.0, { origin: "Ghana", sold_by: "Each", organic: "No" }],
    ["Apple Pink Lady kg", "PRO-APL-KG", 25.0, { origin: "Import", sold_by: "Kg", organic: "No" }],
    ["Strawberries punnet", "PRO-STR-PN", 35.0, { origin: "Import", sold_by: "Punnet", organic: "Yes" }],
    ["Spinach bunch", "PRO-SPN-BN", 5.0, { origin: "Local", sold_by: "Bunch", organic: "Yes" }],
    ["Carrot kg", "PRO-CAR-KG", 9.0, { origin: "Local", sold_by: "Kg", organic: "No" }],
    ["Pineapple each", "PRO-PIN-EA", 12.0, { origin: "Ghana", sold_by: "Each", organic: "No" }],
  ] as const;
  for (const [name, sku, price, meta] of produce) {
    out.push(p("Fresh Produce", name, sku, price, { ...meta }, { expiryDaysFromNow: 5 }));
  }

  const personal = [
    ["Colgate Max Fresh 100ml", "COL-100", 18.0, { brand: "Colgate", size: "100ml", category: "Oral" }],
    ["Oral-B Toothbrush Soft", "OB-TB-S", 12.0, { brand: "Oral-B", size: "1 pc", category: "Oral" }],
    ["Dove Beauty Bar 90g", "DOV-90", 8.0, { brand: "Dove", size: "90g", category: "Bath" }],
    ["Head & Shoulders 400ml", "HS-400", 45.0, { brand: "Head & Shoulders", size: "400ml", category: "Hair" }],
    ["Nivea Men Deodorant", "NIV-DEO", 25.0, { brand: "Nivea", size: "150ml", category: "Men's grooming" }],
    ["Palmolive Shower Gel 500ml", "PAL-500", 28.0, { brand: "Palmolive", size: "500ml", category: "Bath" }],
    ["Vaseline Petroleum Jelly", "VAS-250", 22.0, { brand: "Vaseline", size: "250ml", category: "Skin" }],
    ["Gillette Fusion Blades 4pk", "GIL-F-4", 55.0, { brand: "Gillette", size: "4 pack", category: "Men's grooming" }],
  ] as const;
  for (const [name, sku, price, meta] of personal) {
    out.push(p("Personal Care", name, sku, price, { ...meta }));
  }

  const cosmetics = [
    ["MAC Ruby Woo Lipstick", "MAC-RW", 180.0, { brand: "MAC", shade: "Ruby Woo", product_kind: "Lipstick" }],
    ["Maybelline Fit Me Foundation", "MAY-FM", 95.0, { brand: "Maybelline", shade: "310", product_kind: "Foundation" }],
    ["L'Oreal Voluminous Mascara", "LOR-VOL", 85.0, { brand: "L'Oreal", shade: "Black", product_kind: "Mascara" }],
    ["Chanel No.5 Mini 35ml", "CHN-N5", 450.0, { brand: "Chanel", shade: "Classic", product_kind: "Perfume" }],
    ["Nivea Soft Cream 300ml", "NIV-SFT", 35.0, { brand: "Nivea", shade: "Original", product_kind: "Lotion" }],
    ["The Ordinary Niacinamide", "TO-NIA", 75.0, { brand: "The Ordinary", shade: "10%", product_kind: "Serum" }],
  ] as const;
  for (const [name, sku, price, meta] of cosmetics) {
    out.push(p("Cosmetics & Beauty", name, sku, price, { ...meta }));
  }

  const household = [
    ["Omo Washing Powder 1kg", "OMO-1", 35.0, { brand: "Omo", size: "1kg", use: "Laundry" }],
    ["Sunlight Dish Soap 750ml", "SUN-750", 18.0, { brand: "Sunlight", size: "750ml", use: "Dishes" }],
    ["Dettol Surface Cleaner", "DET-SUR", 28.0, { brand: "Dettol", size: "500ml", use: "Surface" }],
    ["Harpic Toilet Cleaner", "HAR-750", 22.0, { brand: "Harpic", size: "750ml", use: "Toilet" }],
    ["Toilet Paper 12-roll", "TP-12", 45.0, { brand: "Softcare", size: "12 rolls", use: "Paper" }],
    ["Kitchen Towel 2-roll", "KT-2", 18.0, { brand: "Plenty", size: "2 rolls", use: "Paper" }],
    ["Duracell AA 4-pack", "DUR-AA-4", 25.0, { brand: "Duracell", size: "4 cells", use: "Batteries" }],
    ["Bin Bags 30L 20-pack", "BIN-20", 20.0, { brand: "Generic", size: "20 bags", use: "Surface" }],
  ] as const;
  for (const [name, sku, price, meta] of household) {
    out.push(p("Household & Cleaning", name, sku, price, { ...meta }));
  }

  const tech = [
    ["USB-C Cable 1m", "CBL-C-1", 25.0, { brand: "Anker", connector: "USB-C", colour: "Black" }],
    ["Lightning Cable 1m", "CBL-L-1", 35.0, { brand: "Apple", connector: "Lightning", colour: "White" }],
    ["20W USB-C Charger", "CHG-20W", 55.0, { brand: "Samsung", connector: "USB-C", colour: "White" }],
    ["Wireless Earbuds Basic", "EAR-WL", 120.0, { brand: "JBL", connector: "N/A", colour: "Black" }],
    ["HDMI Cable 2m", "HDMI-2", 40.0, { brand: "Belkin", connector: "HDMI", colour: "Black" }],
    ["Phone Screen Protector", "SP-UNIV", 15.0, { brand: "Generic", connector: "N/A", colour: "Clear" }],
    ["Power Bank 10000mAh", "PB-10K", 150.0, { brand: "Xiaomi", connector: "USB-C", colour: "Silver" }],
  ] as const;
  for (const [name, sku, price, meta] of tech) {
    out.push(p("Electronics & Accessories", name, sku, price, { ...meta }, { trackInventory: true }));
  }

  // Promotional items
  out.push(
    p(
      "Soft Drinks & Water",
      "Coca-Cola 2L (Promo)",
      "CC-2L-PROMO",
      18.0,
      { brand: "Coca-Cola", size: "2L", volume_ml: "2000", packaging: "PET", flavour: "Cola" },
      { discountType: "PERCENT", discountValue: 10 },
    ),
  );
  out.push(
    p(
      "Snacks & Chips",
      "Variety Snack Bundle",
      "SNK-VAR-BOX",
      45.0,
      { brand: "Mixed", weight_g: "300", flavour: "Plain" },
      { discountType: "FIXED", discountValue: 5 },
    ),
  );

  return out;
}
