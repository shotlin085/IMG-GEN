/**
 * Garment taxonomy seed (Phase 8). Hierarchical, admin-evolvable.
 * Covers women, men and children including Indian/traditional families.
 * Footwear is out of scope by product definition and intentionally absent.
 */
import { eq } from "drizzle-orm";
import { garmentTaxonomy } from "./schema";
import type { Db } from "./client";

export type GarmentCategory = "women" | "men" | "kids" | "unisex";

export interface TaxonomySeedNode {
  slug: string;
  name: string;
  aliases?: string[];
  description?: string;
  compatibility?: Record<string, unknown>;
  children?: TaxonomySeedNode[];
}

const indian = { regionalStyle: "indian" };
const western = { regionalStyle: "western" };
const fusion = { regionalStyle: "fusion" };
const adult = { ageBands: ["adult"] };
const child = { ageBands: ["child"] };
const drapeable = { drapeSupport: true };

const WOMEN: TaxonomySeedNode[] = [
  { slug: "womens-saree", name: "Saree", aliases: ["Sari", "Sharee"], compatibility: { ...indian, ...adult, ...drapeable }, description: "Draped unstitched garment worn with a blouse and petticoat.", children: [
    { slug: "womens-saree-silk", name: "Silk Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-kanjeevaram", name: "Kanjeevaram Saree", aliases: ["Kanchipuram Saree"], compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-banarasi", name: "Banarasi Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-cotton", name: "Cotton Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-chiffon", name: "Chiffon Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-georgette", name: "Georgette Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-bandhani", name: "Bandhani Saree", aliases: ["Bandhej Saree"], compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-chanderi", name: "Chanderi Saree", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-tussar", name: "Tussar Saree", aliases: ["Tasar Saree"], compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "womens-saree-organza", name: "Organza Saree", compatibility: { ...indian, ...adult, ...drapeable } },
  ] },
  { slug: "womens-lehenga", name: "Lehenga", aliases: ["Lehenga Choli"], compatibility: { ...indian, ...adult }, children: [
    { slug: "womens-lehenga-bridal", name: "Bridal Lehenga", compatibility: { ...indian, ...adult } },
    { slug: "womens-lehenga-crop-top", name: "Crop Top Lehenga", compatibility: { ...indian, ...adult, ...fusion } },
    { slug: "womens-lehenga-jacket", name: "Jacket Lehenga", compatibility: { ...indian, ...adult, ...fusion } },
    { slug: "womens-lehenga-panelled", name: "Panelled Lehenga", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "womens-salwar-kameez", name: "Salwar Kameez", aliases: ["Salwar Suit"], compatibility: { ...indian, ...adult }, children: [
    { slug: "womens-salwar-churidar", name: "Churidar Suit", compatibility: { ...indian, ...adult } },
    { slug: "womens-salwar-patiala", name: "Patiala Suit", compatibility: { ...indian, ...adult } },
    { slug: "womens-salwar-straight", name: "Straight Cut Suit", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "womens-anarkali", name: "Anarkali Suit", aliases: ["Anarkali"], compatibility: { ...indian, ...adult } },
  { slug: "womens-kurti", name: "Kurti", compatibility: { ...indian, ...adult }, children: [
    { slug: "womens-kurti-a-line", name: "A-line Kurti", compatibility: { ...indian, ...adult } },
    { slug: "womens-kurti-straight", name: "Straight Kurti", compatibility: { ...indian, ...adult } },
    { slug: "womens-kurti-angrakha", name: "Angrakha Kurti", compatibility: { ...indian, ...adult } },
    { slug: "womens-kurti-flared", name: "Flared Kurti", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "womens-kurta-set", name: "Kurta Set", compatibility: { ...indian, ...adult } },
  { slug: "womens-sharara-set", name: "Sharara Set", compatibility: { ...indian, ...adult } },
  { slug: "womens-gharara-set", name: "Gharara Set", compatibility: { ...indian, ...adult } },
  { slug: "womens-palazzo-set", name: "Palazzo Set", compatibility: { ...indian, ...adult, ...fusion } },
  { slug: "womens-kaftan", name: "Kaftan", compatibility: { ...fusion, ...adult } },
  { slug: "womens-pavadai", name: "Pavadai / Half Saree", aliases: ["Langa Davani", "Half Saree", "Pattu Pavadai"], compatibility: { ...indian, ...adult, ...drapeable } },
  { slug: "womens-mekhela-chador", name: "Mekhela Chador", compatibility: { ...indian, ...adult, ...drapeable } },
  { slug: "womens-pheran", name: "Pheran", compatibility: { ...indian, ...adult } },
  { slug: "womens-ghagra", name: "Ghagra", compatibility: { ...indian, ...adult } },
  { slug: "womens-chaniya-choli", name: "Chaniya Choli", aliases: ["Chaniya Choli Garba"], compatibility: { ...indian, ...adult } },
  { slug: "womens-blouse-choli", name: "Blouse / Choli", compatibility: { ...indian, ...adult }, children: [
    { slug: "womens-blouse-saree", name: "Saree Blouse", compatibility: { ...indian, ...adult } },
    { slug: "womens-blouse-lehenga", name: "Lehenga Choli", compatibility: { ...indian, ...adult } },
    { slug: "womens-blouse-designer", name: "Designer Blouse", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "womens-dupatta", name: "Dupatta / Odhni", aliases: ["Odhni", "Chunni", "Stole"], compatibility: { ...indian, ...adult, ...drapeable } },
  { slug: "womens-gown", name: "Gown", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-gown-evening", name: "Evening Gown", compatibility: { ...western, ...adult } },
    { slug: "womens-gown-ball", name: "Ball Gown", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-maxi-dress", name: "Maxi Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-midi-dress", name: "Midi Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-mini-dress", name: "Mini Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-bodycon-dress", name: "Bodycon Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-a-line-dress", name: "A-line Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-shirt-dress", name: "Shirt Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-wrap-dress", name: "Wrap Dress", compatibility: { ...western, ...adult } },
  { slug: "womens-jumpsuit", name: "Jumpsuit", compatibility: { ...western, ...adult } },
  { slug: "womens-playsuit", name: "Playsuit", compatibility: { ...western, ...adult } },
  { slug: "womens-co-ord-set", name: "Co-ord Set", aliases: ["Coordinates Set"], compatibility: { ...fusion, ...adult } },
  { slug: "womens-tshirt", name: "T-shirt", compatibility: { ...western, ...adult } },
  { slug: "womens-top", name: "Top", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-top-crop", name: "Crop Top", compatibility: { ...western, ...adult } },
    { slug: "womens-top-tank", name: "Tank Top", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-shirt", name: "Shirt", compatibility: { ...western, ...adult } },
  { slug: "womens-jeans", name: "Jeans", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-jeans-skinny", name: "Skinny Jeans", compatibility: { ...western, ...adult } },
    { slug: "womens-jeans-straight", name: "Straight Jeans", compatibility: { ...western, ...adult } },
    { slug: "womens-jeans-bootcut", name: "Bootcut Jeans", compatibility: { ...western, ...adult } },
    { slug: "womens-jeans-boyfriend", name: "Boyfriend Jeans", compatibility: { ...western, ...adult } },
    { slug: "womens-jeans-flared", name: "Flared Jeans", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-trousers", name: "Trousers", compatibility: { ...western, ...adult } },
  { slug: "womens-shorts", name: "Shorts", compatibility: { ...western, ...adult } },
  { slug: "womens-skirt", name: "Skirt", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-skirt-a-line", name: "A-line Skirt", compatibility: { ...western, ...adult } },
    { slug: "womens-skirt-pencil", name: "Pencil Skirt", compatibility: { ...western, ...adult } },
    { slug: "womens-skirt-pleated", name: "Pleated Skirt", compatibility: { ...western, ...adult } },
    { slug: "womens-skirt-midi", name: "Midi Skirt", compatibility: { ...western, ...adult } },
    { slug: "womens-skirt-maxi", name: "Maxi Skirt", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-blazer", name: "Blazer", compatibility: { ...western, ...adult } },
  { slug: "womens-jacket", name: "Jacket", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-jacket-denim", name: "Denim Jacket", compatibility: { ...western, ...adult } },
    { slug: "womens-jacket-leather", name: "Leather Jacket", compatibility: { ...western, ...adult } },
    { slug: "womens-jacket-bomber", name: "Bomber Jacket", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-sweater", name: "Sweater", compatibility: { ...western, ...adult } },
  { slug: "womens-cardigan", name: "Cardigan", compatibility: { ...western, ...adult } },
  { slug: "womens-hoodie", name: "Hoodie", compatibility: { ...western, ...adult } },
  { slug: "womens-sweatshirt", name: "Sweatshirt", compatibility: { ...western, ...adult } },
  { slug: "womens-trench-coat", name: "Trench Coat", compatibility: { ...western, ...adult } },
  { slug: "womens-leggings", name: "Leggings", compatibility: { ...western, ...adult } },
  { slug: "womens-jeggings", name: "Jeggings", compatibility: { ...western, ...adult } },
  { slug: "womens-swimwear", name: "Swimwear", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-swimwear-one-piece", name: "One-piece Swimsuit", compatibility: { ...western, ...adult } },
    { slug: "womens-swimwear-bikini", name: "Bikini", compatibility: { ...western, ...adult } },
  ] },
  { slug: "womens-nightwear", name: "Nightwear", compatibility: { ...western, ...adult }, children: [
    { slug: "womens-nightwear-gown", name: "Nightgown", compatibility: { ...western, ...adult } },
    { slug: "womens-nightwear-pyjama", name: "Pyjama Set", aliases: ["Pajama Set"], compatibility: { ...western, ...adult } },
    { slug: "womens-nightwear-robe", name: "Robe", aliases: ["Bathrobe"], compatibility: { ...western, ...adult } },
  ] },
];

const MEN: TaxonomySeedNode[] = [
  { slug: "mens-kurta", name: "Kurta", compatibility: { ...indian, ...adult }, children: [
    { slug: "mens-kurta-casual", name: "Casual Kurta", compatibility: { ...indian, ...adult } },
    { slug: "mens-kurta-festive", name: "Festive Kurta", compatibility: { ...indian, ...adult } },
    { slug: "mens-kurta-pathani", name: "Pathani Kurta", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "mens-kurta-pajama-set", name: "Kurta Pajama Set", aliases: ["Kurta Payjama"], compatibility: { ...indian, ...adult } },
  { slug: "mens-sherwani", name: "Sherwani", compatibility: { ...indian, ...adult }, children: [
    { slug: "mens-sherwani-classic", name: "Classic Sherwani", compatibility: { ...indian, ...adult } },
    { slug: "mens-sherwani-indo-western", name: "Indo-Western Sherwani", compatibility: { ...indian, ...adult, ...fusion } },
    { slug: "mens-sherwani-achkan", name: "Achkan", compatibility: { ...indian, ...adult } },
  ] },
  { slug: "mens-nehru-jacket", name: "Nehru Jacket", aliases: ["Modi Jacket", "Bandi"], compatibility: { ...indian, ...adult } },
  { slug: "mens-bandhgala", name: "Bandhgala Jacket", aliases: ["Jodhpuri Jacket"], compatibility: { ...indian, ...adult } },
  { slug: "mens-pathani-suit", name: "Pathani Suit", compatibility: { ...indian, ...adult } },
  { slug: "mens-dhoti", name: "Dhoti", compatibility: { ...indian, ...adult, ...drapeable }, children: [
    { slug: "mens-dhoti-classic", name: "Classic Dhoti", compatibility: { ...indian, ...adult, ...drapeable } },
    { slug: "mens-dhoti-stitched", name: "Stitched Dhoti", aliases: ["Ready Dhoti"], compatibility: { ...indian, ...adult } },
  ] },
  { slug: "mens-lungi", name: "Lungi", compatibility: { ...indian, ...adult, ...drapeable } },
  { slug: "mens-mundu", name: "Mundu", aliases: ["Veshti"], compatibility: { ...indian, ...adult, ...drapeable } },
  { slug: "mens-angarkha", name: "Angarkha", compatibility: { ...indian, ...adult } },
  { slug: "mens-ethnic-jacket-set", name: "Ethnic Jacket Set", compatibility: { ...indian, ...adult, ...fusion } },
  { slug: "mens-shirt", name: "Shirt", compatibility: { ...western, ...adult }, children: [
    { slug: "mens-shirt-casual", name: "Casual Shirt", compatibility: { ...western, ...adult } },
    { slug: "mens-shirt-formal", name: "Formal Shirt", compatibility: { ...western, ...adult } },
    { slug: "mens-shirt-linen", name: "Linen Shirt", compatibility: { ...western, ...adult } },
    { slug: "mens-shirt-denim", name: "Denim Shirt", compatibility: { ...western, ...adult } },
  ] },
  { slug: "mens-tshirt", name: "T-shirt", compatibility: { ...western, ...adult }, children: [
    { slug: "mens-tshirt-crew", name: "Crew Neck T-shirt", compatibility: { ...western, ...adult } },
    { slug: "mens-tshirt-vneck", name: "V-neck T-shirt", compatibility: { ...western, ...adult } },
    { slug: "mens-tshirt-polo", name: "Polo T-shirt", aliases: ["Polo Shirt"], compatibility: { ...western, ...adult } },
    { slug: "mens-tshirt-henley", name: "Henley T-shirt", compatibility: { ...western, ...adult } },
  ] },
  { slug: "mens-jeans", name: "Jeans", compatibility: { ...western, ...adult } },
  { slug: "mens-trousers", name: "Trousers", compatibility: { ...western, ...adult }, children: [
    { slug: "mens-trousers-chinos", name: "Chinos", compatibility: { ...western, ...adult } },
    { slug: "mens-trousers-formal", name: "Formal Trousers", compatibility: { ...western, ...adult } },
    { slug: "mens-trousers-cargo", name: "Cargo Pants", compatibility: { ...western, ...adult } },
  ] },
  { slug: "mens-shorts", name: "Shorts", compatibility: { ...western, ...adult } },
  { slug: "mens-blazer", name: "Blazer", compatibility: { ...western, ...adult } },
  { slug: "mens-suit", name: "Suit", compatibility: { ...western, ...adult }, children: [
    { slug: "mens-suit-two-piece", name: "Two-piece Suit", compatibility: { ...western, ...adult } },
    { slug: "mens-suit-three-piece", name: "Three-piece Suit", compatibility: { ...western, ...adult } },
  ] },
  { slug: "mens-jacket", name: "Jacket", compatibility: { ...western, ...adult }, children: [
    { slug: "mens-jacket-bomber", name: "Bomber Jacket", compatibility: { ...western, ...adult } },
    { slug: "mens-jacket-leather", name: "Leather Jacket", compatibility: { ...western, ...adult } },
    { slug: "mens-jacket-denim", name: "Denim Jacket", compatibility: { ...western, ...adult } },
    { slug: "mens-jacket-quilted", name: "Quilted Jacket", compatibility: { ...western, ...adult } },
  ] },
  { slug: "mens-sweater", name: "Sweater", compatibility: { ...western, ...adult } },
  { slug: "mens-hoodie", name: "Hoodie", compatibility: { ...western, ...adult } },
  { slug: "mens-sweatshirt", name: "Sweatshirt", compatibility: { ...western, ...adult } },
  { slug: "mens-joggers", name: "Joggers", compatibility: { ...western, ...adult } },
  { slug: "mens-track-pants", name: "Track Pants", compatibility: { ...western, ...adult } },
];

const KIDS: TaxonomySeedNode[] = [
  { slug: "kids-girls-frock", name: "Girls Frock", aliases: ["Girls Dress"], compatibility: { ...child }, children: [
    { slug: "kids-girls-frock-party", name: "Party Frock", compatibility: { ...child } },
    { slug: "kids-girls-frock-casual", name: "Casual Frock", compatibility: { ...child } },
  ] },
  { slug: "kids-girls-gown", name: "Girls Gown", compatibility: { ...child } },
  { slug: "kids-girls-lehenga-choli", name: "Girls Lehenga Choli", compatibility: { ...indian, ...child }, children: [
    { slug: "kids-girls-lehenga-bridal", name: "Girls Festive Lehenga", compatibility: { ...indian, ...child } },
  ] },
  { slug: "kids-girls-kurti-set", name: "Girls Kurti Set", compatibility: { ...indian, ...child } },
  { slug: "kids-girls-salwar-suit", name: "Girls Salwar Suit", compatibility: { ...indian, ...child } },
  { slug: "kids-girls-pattu-pavadai", name: "Girls Pattu Pavadai", aliases: ["Silk Pavadai"], compatibility: { ...indian, ...child } },
  { slug: "kids-girls-skirt-top", name: "Girls Skirt & Top", compatibility: { ...child } },
  { slug: "kids-boys-kurta-pajama", name: "Boys Kurta Pajama", compatibility: { ...indian, ...child } },
  { slug: "kids-boys-sherwani", name: "Boys Sherwani", compatibility: { ...indian, ...child } },
  { slug: "kids-boys-dhoti-set", name: "Boys Dhoti Set", compatibility: { ...indian, ...child } },
  { slug: "kids-boys-shirt", name: "Boys Shirt", compatibility: { ...child } },
  { slug: "kids-boys-tshirt", name: "Boys T-shirt", compatibility: { ...child } },
  { slug: "kids-boys-shorts", name: "Boys Shorts", compatibility: { ...child } },
  { slug: "kids-boys-trousers", name: "Boys Trousers", compatibility: { ...child } },
  { slug: "kids-romper", name: "Romper / Onesie", aliases: ["Onesie", "Bodysuit"], compatibility: { ...child } },
  { slug: "kids-sweatshirt", name: "Kids Sweatshirt", compatibility: { ...child } },
  { slug: "kids-hoodie", name: "Kids Hoodie", compatibility: { ...child } },
  { slug: "kids-jacket", name: "Kids Jacket", compatibility: { ...child } },
  { slug: "kids-jeans", name: "Kids Jeans", compatibility: { ...child } },
  { slug: "kids-co-ord-set", name: "Kids Co-ord Set", compatibility: { ...child } },
];

const CATEGORY_NODES: Array<{ category: GarmentCategory; nodes: TaxonomySeedNode[] }> = [
  { category: "women", nodes: WOMEN },
  { category: "men", nodes: MEN },
  { category: "kids", nodes: KIDS },
];

async function upsertNode(
  db: Db,
  node: TaxonomySeedNode,
  category: GarmentCategory,
  parentId: string | null,
  sortOrder: number,
): Promise<string> {
  const values = {
    parentId,
    category,
    slug: node.slug,
    name: node.name,
    aliases: node.aliases ?? [],
    description: node.description ?? null,
    compatibility: node.compatibility ?? {},
    isActive: true,
    sortOrder,
  };
  const existing = await db
    .select({ id: garmentTaxonomy.id, parentId: garmentTaxonomy.parentId })
    .from(garmentTaxonomy)
    .where(eq(garmentTaxonomy.slug, node.slug))
    .limit(1);
  let id: string;
  if (existing.length > 0) {
    id = existing[0].id;
    if (existing[0].parentId !== parentId) {
      await db.update(garmentTaxonomy).set({ parentId }).where(eq(garmentTaxonomy.id, id));
    }
  } else {
    const inserted = await db.insert(garmentTaxonomy).values(values).returning({ id: garmentTaxonomy.id });
    id = inserted[0].id;
  }
  for (const [index, child] of (node.children ?? []).entries()) {
    await upsertNode(db, child, category, id, index);
  }
  return id;
}

/** Idempotent: safe to run on every seed; existing nodes are left in place. */
export async function seedGarmentTaxonomy(db: Db): Promise<number> {
  let count = 0;
  for (const { category, nodes } of CATEGORY_NODES) {
    for (const [index, node] of nodes.entries()) {
      await upsertNode(db, node, category, null, index);
      count += 1;
    }
  }
  return count;
}
