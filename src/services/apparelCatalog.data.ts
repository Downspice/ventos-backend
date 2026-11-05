import type { ProductMetadataValueType } from "../models/ProductMetadataField.js";
import type { DemoProductDef, DemoTypeDef } from "./demoCatalog.data.js";

export type ApparelProductDef = DemoProductDef & {
  categoryName: string;
  imageUrl: string;
};

export const APPAREL_PRODUCT_TYPES: DemoTypeDef[] = [
  {
    name: "T-Shirts & Tops",
    description: "Casual and dress tops for men and women",
    sortOrder: 0,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["XS", "S", "M", "L", "XL", "XXL"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "gender",
        label: "Gender",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Women", "Men", "Unisex"],
        sortOrder: 3,
      },
      {
        key: "material",
        label: "Material",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Cotton", "Linen", "Poly blend", "Silk blend"],
        sortOrder: 4,
      },
    ],
  },
  {
    name: "Pants & Jeans",
    description: "Denim, chinos, and tailored trousers",
    sortOrder: 1,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Waist",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["28", "30", "32", "34", "36", "38"],
        sortOrder: 1,
      },
      { key: "color", label: "Wash / color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "fit",
        label: "Fit",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Slim", "Regular", "Relaxed", "Wide"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Dresses & Skirts",
    description: "Dresses, skirts, and coordinated sets",
    sortOrder: 2,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["XS", "S", "M", "L", "XL"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "length",
        label: "Length",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Mini", "Midi", "Maxi"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Outerwear",
    description: "Jackets, coats, and layers",
    sortOrder: 3,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["S", "M", "L", "XL"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "season",
        label: "Season",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Spring", "Summer", "Fall", "Winter", "All-season"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Footwear",
    description: "Sneakers, boots, and dress shoes",
    sortOrder: 4,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "EU size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["38", "39", "40", "41", "42", "43", "44", "45"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "style",
        label: "Style",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Sneaker", "Boot", "Loafer", "Sandal", "Heel"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Bags & Accessories",
    description: "Bags, belts, hats, and jewelry",
    sortOrder: 5,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 1 },
      {
        key: "category",
        label: "Category",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Handbag", "Backpack", "Belt", "Hat", "Scarf", "Jewelry"],
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Activewear",
    description: "Gym and athleisure",
    sortOrder: 6,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["XS", "S", "M", "L", "XL"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "activity",
        label: "Activity",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Running", "Yoga", "Training", "Casual"],
        sortOrder: 3,
      },
    ],
  },
  {
    name: "Kids & Baby",
    description: "Children's clothing",
    sortOrder: 7,
    fields: [
      { key: "brand", label: "Brand", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 0 },
      {
        key: "size",
        label: "Size",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"],
        sortOrder: 1,
      },
      { key: "color", label: "Color", valueType: "TEXT" as ProductMetadataValueType, sortOrder: 2 },
      {
        key: "gender",
        label: "Gender",
        valueType: "SELECT" as ProductMetadataValueType,
        options: ["Girls", "Boys", "Unisex"],
        sortOrder: 3,
      },
    ],
  },
];

export const APPAREL_CATEGORIES = [
  "Women's",
  "Men's",
  "Unisex",
  "Kids",
  "Accessories",
  "Footwear",
  "Sale",
] as const;

function p(
  typeName: string,
  categoryName: string,
  name: string,
  sku: string,
  price: number,
  imageUrl: string,
  metadata: Record<string, string>,
  extra?: Partial<DemoProductDef>,
): ApparelProductDef {
  const cost = extra?.cost ?? Math.round(price * 0.55 * 100) / 100;
  return {
    typeName,
    categoryName,
    name,
    sku,
    price,
    cost,
    imageUrl,
    metadata,
    trackInventory: extra?.trackInventory ?? true,
    ...extra,
  };
}

/** ~70 SKUs for a clothing & apparel boutique. Image URLs are public Unsplash CDN links. */
export function buildApparelProducts(): ApparelProductDef[] {
  const u = (id: string) => `https://images.unsplash.com/${id}?w=480&h=480&fit=crop&q=80`;

  const out: ApparelProductDef[] = [];

  const tops = [
    ["Women's", "Linen Blend Camp Shirt — Ivory", "W-TOP-LIN-IV-M", 189, "photo-1596755094514-f87e34085b56", { brand: "Ventos Atelier", size: "M", color: "Ivory", gender: "Women", material: "Linen" }],
    ["Women's", "Ribbed Knit Tank — Sage", "W-TOP-RIB-SG-S", 79, "photo-1434389677669-e08b4cac3105", { brand: "Field & Thread", size: "S", color: "Sage", gender: "Women", material: "Cotton" }],
    ["Women's", "Silk Touch Blouse — Black", "W-TOP-SLK-BK-M", 245, "photo-1564257631407-3deb25fe6383", { brand: "Maison Linea", size: "M", color: "Black", gender: "Women", material: "Silk blend" }],
    ["Women's", "Oversized Cotton Tee — White", "W-TOP-OVR-WH-L", 65, "photo-1521572163474-6864f9cf17ab", { brand: "Basics Co.", size: "L", color: "White", gender: "Women", material: "Cotton" }],
    ["Men's", "Heavyweight Pocket Tee — Navy", "M-TOP-HVY-NV-L", 72, "photo-1583743814966-8936f5b7be1a", { brand: "North Ridge", size: "L", color: "Navy", gender: "Men", material: "Cotton" }],
    ["Men's", "Merino Crew Neck — Charcoal", "M-TOP-MER-CH-M", 165, "photo-1618351131376-c5120e0a226a", { brand: "Wool & Co.", size: "M", color: "Charcoal", gender: "Men", material: "Cotton" }],
    ["Men's", "Oxford Button-Down — Sky", "M-TOP-OXF-SK-M", 128, "photo-1598033129183-c4f50d2e2a8e", { brand: "Harbor Cloth", size: "M", color: "Sky blue", gender: "Men", material: "Cotton" }],
    ["Unisex", "Graphic Tee — Vintage Wash", "U-TOP-GRF-VW-M", 58, "photo-1576566588028-4147f3842f27", { brand: "Street Archive", size: "M", color: "Grey", gender: "Unisex", material: "Cotton" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of tops) {
    out.push(p("T-Shirts & Tops", cat, name, sku, price, u(img), { ...meta }));
  }

  const pants = [
    ["Women's", "High-Rise Straight Jeans — Indigo", "W-JNS-HR-IND-28", 198, "photo-1541099649106-f69ad21f3246", { brand: "Denim Lab", size: "28", color: "Indigo", fit: "Regular" }],
    ["Women's", "Wide Leg Trousers — Camel", "W-PNT-WD-CM-30", 210, "photo-1594633312681-425c7b97ccd1", { brand: "Maison Linea", size: "30", color: "Camel", fit: "Wide" }],
    ["Men's", "Slim Taper Jeans — Dark Wash", "M-JNS-SLM-DW-32", 185, "photo-1542272604-787c3835535d", { brand: "Denim Lab", size: "32", color: "Dark wash", fit: "Slim" }],
    ["Men's", "Stretch Chino — Khaki", "M-PNT-CH-KH-34", 142, "photo-1473966968600-fa801b069a0a", { brand: "Harbor Cloth", size: "34", color: "Khaki", fit: "Regular" }],
    ["Men's", "Relaxed Cargo Pant — Olive", "M-PNT-CGO-OL-34", 156, "photo-1624378439575-d8705ad7ae80", { brand: "North Ridge", size: "34", color: "Olive", fit: "Relaxed" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of pants) {
    out.push(p("Pants & Jeans", cat, name, sku, price, u(img), { ...meta }));
  }

  const dresses = [
    ["Women's", "Midi Wrap Dress — Rust", "W-DRS-WRP-RS-M", 265, "photo-1595777457583-95e059d581b8", { brand: "Field & Thread", size: "M", color: "Rust", length: "Midi" }],
    ["Women's", "Floral Maxi Dress — Cream", "W-DRS-FLR-CR-L", 298, "photo-1496747611180-343382c8452e", { brand: "Ventos Atelier", size: "L", color: "Cream", length: "Maxi" }],
    ["Women's", "Pleated Mini Skirt — Black", "W-SKT-PLE-BK-S", 118, "photo-1583498255959-b588660f326a", { brand: "Maison Linea", size: "S", color: "Black", length: "Mini" }],
    ["Women's", "Satin Slip Dress — Champagne", "W-DRS-SLP-CH-M", 320, "photo-1515372039744-b8f02a3ae446", { brand: "Maison Linea", size: "M", color: "Champagne", length: "Midi" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of dresses) {
    out.push(p("Dresses & Skirts", cat, name, sku, price, u(img), { ...meta }));
  }

  const outer = [
    ["Women's", "Quilted Liner Jacket — Stone", "W-JKT-QLT-ST-M", 275, "photo-1544022613-e87ca75a784a", { brand: "North Ridge", size: "M", color: "Stone", season: "Fall" }],
    ["Men's", "Wool Blend Overcoat — Charcoal", "M-COT-WBL-CH-L", 420, "photo-1539533010702-4f632a47d1f2", { brand: "Wool & Co.", size: "L", color: "Charcoal", season: "Winter" }],
    ["Unisex", "Lightweight Puffer — Black", "U-PFF-LT-BK-M", 245, "photo-1551028711-e8eae9270b75", { brand: "North Ridge", size: "M", color: "Black", season: "All-season" }],
    ["Men's", "Denim Trucker Jacket — Mid Wash", "M-JKT-DNM-MW-L", 198, "photo-1576995853123-5a10305d93c0", { brand: "Denim Lab", size: "L", color: "Mid wash", season: "Spring" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of outer) {
    out.push(p("Outerwear", cat, name, sku, price, u(img), { ...meta }));
  }

  const shoes = [
    ["Footwear", "Classic Leather Sneaker — White", "F-SNK-CL-WH-42", 220, "photo-1549298916-b41d501d3772", { brand: "Step One", size: "42", color: "White", style: "Sneaker" }],
    ["Footwear", "Retro Runner — Grey / Orange", "F-SNK-RT-GR-43", 195, "photo-1606107557195-0e29a4b5b4aa", { brand: "Step One", size: "43", color: "Grey", style: "Sneaker" }],
    ["Footwear", "Chelsea Boot — Tan", "F-BOT-CH-TN-41", 310, "photo-1638247025967-f4d38ebb2e8f", { brand: "Heritage Boot Co.", size: "41", color: "Tan", style: "Boot" }],
    ["Women's", "Block Heel Sandal — Nude", "W-SND-BLK-ND-39", 168, "photo-1543163521-1bf539c55dd1", { brand: "Maison Linea", size: "39", color: "Nude", style: "Sandal" }],
    ["Men's", "Penny Loafer — Burgundy", "M-LFR-PNY-BG-42", 245, "photo-1533860872563-9aef3106a7f8", { brand: "Heritage Boot Co.", size: "42", color: "Burgundy", style: "Loafer" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of shoes) {
    out.push(p("Footwear", cat, name, sku, price, u(img), { ...meta }));
  }

  const acc = [
    ["Accessories", "Leather Tote — Cognac", "A-BAG-TOT-CG", 285, "photo-1584917865442-de89df76afd3", { brand: "Artisan Leather", color: "Cognac", category: "Handbag" }],
    ["Accessories", "Canvas Daypack — Forest", "A-BAG-BPK-FS", 145, "photo-1553062407-98eeb64c6a62", { brand: "North Ridge", color: "Forest", category: "Backpack" }],
    ["Accessories", "Full Grain Belt — Brown", "A-BLT-FG-BR", 88, "photo-1624229243726-6b67c0b8d238", { brand: "Artisan Leather", color: "Brown", category: "Belt" }],
    ["Accessories", "Wool Fedora — Grey", "A-HAT-FED-GR", 95, "photo-1514327605117-bc4ae9a73a7c", { brand: "Field & Thread", color: "Grey", category: "Hat" }],
    ["Accessories", "Cashmere Scarf — Oatmeal", "A-SCF-CS-OAT", 125, "photo-1520903920243-00d872a2ad1b", { brand: "Wool & Co.", color: "Oatmeal", category: "Scarf" }],
    ["Accessories", "Gold Hoop Earrings — Medium", "A-JWL-HP-MD", 68, "photo-1535632066927-ab7c9ab60908", { brand: "Studio Nine", color: "Gold", category: "Jewelry" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of acc) {
    out.push(p("Bags & Accessories", cat, name, sku, price, u(img), { ...meta }));
  }

  const active = [
    ["Women's", "Seamless Leggings — Black", "W-ACT-LEG-BK-M", 98, "photo-1506629082955-511b1f5625cb", { brand: "Pulse Active", size: "M", color: "Black", activity: "Yoga" }],
    ["Women's", "Sports Bra — Coral", "W-ACT-BRA-CR-S", 72, "photo-1571019613454-1cb2f99b2d8b", { brand: "Pulse Active", size: "S", color: "Coral", activity: "Training" }],
    ["Men's", "Performance Short — Navy", "M-ACT-SHT-NV-L", 85, "photo-1599453033734-aaacac7d6270", { brand: "Pulse Active", size: "L", color: "Navy", activity: "Running" }],
    ["Unisex", "Tech Fleece Hoodie — Heather", "U-ACT-HDY-HG-M", 135, "photo-1556821840-3a63f95609a7", { brand: "Pulse Active", size: "M", color: "Heather", activity: "Casual" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of active) {
    out.push(p("Activewear", cat, name, sku, price, u(img), { ...meta }));
  }

  const kids = [
    ["Kids", "Organic Cotton Tee — Sunshine", "K-TOP-ORG-YS-6Y", 42, "photo-1503454537195-1dcabb655ffb", { brand: "Little Loom", size: "6Y", color: "Yellow", gender: "Unisex" }],
    ["Kids", "Denim Overalls — Light Wash", "K-OVR-DNM-8Y", 78, "photo-1519238263530-6ebb5f4d8e6f", { brand: "Little Loom", size: "8Y", color: "Light wash", gender: "Girls" }],
    ["Kids", "Fleece Jogger Set — Grey", "K-SET-FLC-10Y", 95, "photo-1514099226765-9e343eaed1bd", { brand: "Little Loom", size: "10Y", color: "Grey", gender: "Boys" }],
  ] as const;
  for (const [cat, name, sku, price, img, meta] of kids) {
    out.push(p("Kids & Baby", cat, name, sku, price, u(img), { ...meta }));
  }

  out.push(
    p(
      "T-Shirts & Tops",
      "Sale",
      "End-of-Season Tee Bundle (2-pack)",
      "SALE-TOP-2PK",
      99,
      u("photo-1618351131376-c5120e0a226a"),
      { brand: "Basics Co.", size: "M", color: "Mixed", gender: "Unisex", material: "Cotton" },
      { discountType: "PERCENT", discountValue: 15 },
    ),
  );
  out.push(
    p(
      "Footwear",
      "Sale",
      "Last Pair — Runner Clearance",
      "SALE-SNK-CLR",
      149,
      u("photo-1460353581641-37baddab0fa2"),
      { brand: "Step One", size: "44", color: "Blue", style: "Sneaker" },
      { discountType: "FIXED", discountValue: 40 },
    ),
  );

  return out;
}
