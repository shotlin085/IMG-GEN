/**
 * Wear-style seed (Phase 11): how a garment is actually worn.
 * 14 saree drapes, 12 dupatta placements, regional looks. Idempotent by slug.
 */
import { eq } from "drizzle-orm";
import { wearStyles } from "./schema";
import type { Db } from "./client";

type WearSeed = {
  kind: "saree_drape" | "dupatta_placement" | "regional_look" | "layering";
  slug: string;
  name: string;
  description?: string;
  region?: string;
  taxonomySlugs?: string[];
  compatibility?: Record<string, unknown>;
  promptFragment: string;
  drapeSteps?: string[];
  sortOrder?: number;
};

const NIVI = { occasions: ["everyday", "office", "festive"], formality: "versatile" };

export const WEAR_STYLE_SEEDS: WearSeed[] = [
  /* ---------------- saree drapes (14) ---------------- */
  { kind: "saree_drape", slug: "drape-nivi", name: "Nivi drape", region: "Andhra Pradesh / Telangana", description: "The standard modern drape: pleats at the centre front, pallu over the left shoulder.", taxonomySlugs: ["womens-saree", "womens-saree-silk", "womens-saree-cotton"], compatibility: NIVI, drapeSteps: ["Pleats tucked at centre front", "Pallu taken over the left shoulder", "Blouse fully covered by the pallu"], promptFragment: "Classic Nivi drape: floor-length saree with neatly pressed pleats falling from the centre of the waist, the pallu drawn diagonally across the torso and resting on the left shoulder, blouse visible at the midriff in the traditional way." },
  { kind: "saree_drape", slug: "drape-bengali-atpoure", name: "Bengali drape (Atpoure)", region: "West Bengal", description: "Pleats at the back, pallu brought from behind over both shoulders.", taxonomySlugs: ["womens-saree", "womens-saree-cotton", "womens-saree-tussar"], compatibility: { occasions: ["festive", "religious"], formality: "festive" }, drapeSteps: ["No front pleats", "Pallu from back over both shoulders", "Ends hanging loose in front"], promptFragment: "Traditional Bengali Atpoure drape: no front pleats, the saree body wrapped smoothly with the pallu brought from the back over both shoulders and falling loose in front, often with a red border framed across the chest." },
  { kind: "saree_drape", slug: "drape-gujarati-shaicha", name: "Gujarati drape (Shaicha)", region: "Gujarat", description: "Pallu comes from the back to the front over the right shoulder.", taxonomySlugs: ["womens-saree", "womens-saree-silk", "womens-saree-bandhani"], compatibility: { occasions: ["festive", "dance"], formality: "festive" }, drapeSteps: ["Front pleats", "Pallu taken behind and over the right shoulder to the front"], promptFragment: "Gujarati Shaicha drape: centre-front pleats with the pallu taken around the back and brought to the front over the right shoulder, so the decorated end is displayed in front of the body." },
  { kind: "saree_drape", slug: "drape-nauvari", name: "Nauvari drape", region: "Maharashtra", description: "Nine-yard saree worn trouser-style, allowing free movement.", taxonomySlugs: ["womens-saree", "womens-saree-silk"], compatibility: { occasions: ["traditional", "wedding"], formality: "high" }, drapeSteps: ["Lower end formed into a turban-like band between the legs", "Pallu over the left shoulder", "Full length to the ankles"], promptFragment: "Maharashtrian Nauvari drape: a nine-yard saree worn in the traditional trouser style with the fabric drawn between the legs and tucked at the back, hem falling to the ankles, the pallu across the torso and over the left shoulder." },
  { kind: "saree_drape", slug: "drape-madisar", name: "Madisar drape", region: "Tamil Nadu", description: "Nine-yard weave worn by Brahmin women for rituals.", taxonomySlugs: ["womens-saree", "womens-saree-silk", "womens-saree-kanjeevaram"], compatibility: { occasions: ["religious", "wedding"], formality: "high" }, drapeSteps: ["Lower wrap with a between-the-legs fold", "Upper pleats at the waist", "Pallu over the left shoulder"], promptFragment: "Tamil Madisar drape: a nine-yard saree folded in the ritual style, with the lower portion wrapped and pleated between the legs, an unbroken waist line and the decorated end over the left shoulder." },
  { kind: "saree_drape", slug: "drape-kerala-munduputtavum", name: "Kerala drape (Munduputtavum)", region: "Kerala", description: "Two-piece look with a centre pleat and a shoulder fold.", taxonomySlugs: ["womens-saree", "womens-saree-cotton", "womens-saree-organza"], compatibility: { occasions: ["traditional", "festive"], formality: "high" }, drapeSteps: ["Pleat gathered at the centre", "Shoulder fold mirrors the upper mundu border"], promptFragment: "Kerala Munduputtavum drape: a cream and gold-bordered saree with a crisp centre pleat and a distinct upper cloth effect over the shoulder, the gold border framed horizontally across the blouse." },
  { kind: "saree_drape", slug: "drape-odisha-sambalpuri", name: "Odia drape (Sambalpuri)", region: "Odisha", description: "Sahu-style drape with the pallu brought to the front.", taxonomySlugs: ["womens-saree", "womens-saree-cotton"], compatibility: { occasions: ["festive", "cultural"], formality: "versatile" }, drapeSteps: ["Shorter front hem", "Pallu folded at the waist then across the shoulder"], promptFragment: "Odia Sambalpuri drape: a handloom saree with ikat borders worn with the pallu folded at the waist and drawn across the shoulder, hem sitting slightly shorter with a characteristic frontal fold." },
  { kind: "saree_drape", slug: "drape-parsi", name: "Parsi drape (Gara)", region: "Mumbai / Udvada", description: "Embroidered gara with a structured shoulder roll.", taxonomySlugs: ["womens-saree", "womens-saree-silk"], compatibility: { occasions: ["ceremonial"], formality: "high" }, drapeSteps: ["Stiff shoulder roll", "Pallu pinned at the bust"], promptFragment: "Parsi gara drape: a heavily embroidered saree held with a structured roll across the shoulder and the decorated pallu pinned neatly at the bust." },
  { kind: "saree_drape", slug: "drape-goao-kunbi", name: "Goan Kunbi drape", region: "Goa", description: "Nine-inch Kunbi weave tied at the chest with a loose front.", taxonomySlugs: ["womens-saree", "womens-saree-cotton"], compatibility: { occasions: ["cultural", "festival"], formality: "everyday" }, drapeSteps: ["Fabric knotted at the chest", "Hem falls to the knees"], promptFragment: "Goan Kunbi drape: a coarse cotton Kunbi saree tied across the chest with the knot at the front and the hem falling to the knees, worn in the traditional village style." },
  { kind: "saree_drape", slug: "drape-lehenga-style", name: "Lehenga-style saree", region: "Contemporary, pan-Indian", description: "Saree pre-stitched into a skirt-and-blouse silhouette.", taxonomySlugs: ["womens-saree", "womens-saree-chiffon", "womens-saree-georgette"], compatibility: { occasions: ["party", "reception"], formality: "glamorous" }, drapeSteps: ["Skirt flares from the waist", "Pallu fixed over one shoulder"], promptFragment: "Lehenga-style saree: the drape constructed as a flared floor-length skirt with a fixed pallu over one shoulder, giving saree detailing with a gown-like silhouette." },
  { kind: "saree_drape", slug: "drape-pant-style", name: "Dhoti-pant saree", region: "Contemporary, pan-Indian", description: "Pre-draped saree over fitted trousers.", taxonomySlugs: ["womens-saree", "womens-saree-georgette", "womens-saree-organza"], compatibility: { occasions: ["fusion", "runway"], formality: "contemporary" }, drapeSteps: ["Drape tacked at the waist", "Pallu falls over the shoulder"], promptFragment: "Dhoti-pant saree: a pre-draped saree set over fitted straight trousers, with the pleats tacked cleanly at the waist and the pallu falling over one shoulder." },
  { kind: "saree_drape", slug: "drape-seedha-pallu", name: "Seedha pallu drape", region: "North India", description: "Pallu taken straight back and displayed on both shoulders.", taxonomySlugs: ["womens-saree", "womens-saree-chiffon"], compatibility: { occasions: ["office", "everyday"], formality: "modest" }, drapeSteps: ["Pallu divided evenly across both shoulders"], promptFragment: "Seedha pallu drape: the pallu brought from the back and divided evenly across both shoulders, the border reading symmetrically on either side of the neckline." },
  { kind: "saree_drape", slug: "drape-retro-falling", name: "Retro falling drape", region: "1960s–80s Hindi cinema", description: "Loose, single pleat with a cascading pallu.", taxonomySlugs: ["womens-saree", "womens-saree-chiffon", "womens-saree-georgette"], compatibility: { occasions: ["editorial", "portfolio"], formality: "glamorous" }, drapeSteps: ["One soft pleat at the hip", "Pallu left to cascade"], promptFragment: "Retro falling drape: a fluid chiffon saree with a single soft pleat at the hip and a loose pallu cascading diagonally, styled like classic studio portraiture." },
  { kind: "saree_drape", slug: "drape-tribal", name: "Tribal drape", region: "Central / North-East India", description: "Short wrap with woven geometric panels.", taxonomySlugs: ["womens-saree", "womens-saree-cotton"], compatibility: { occasions: ["cultural"], formality: "everyday" }, drapeSteps: ["Wrapped to below the knee", "Extra length tucked at the waist"], promptFragment: "Tribal drape: a handwoven cotton saree with geometric woven panels wrapped shorter to below the knee, the spare length tucked firmly at the waist." },
  /* ---------------- dupatta placements (12) ---------------- */
  { kind: "dupatta_placement", slug: "dupatta-both-shoulders", name: "Both shoulders, even", description: "Dupatta divided evenly over both shoulders, ends hanging at the back.", taxonomySlugs: ["womens-dupatta", "womens-salwar-kameez", "womens-anarkali"], compatibility: { modesty: "high" }, promptFragment: "Dupatta spread evenly across both shoulders with the length falling behind, the embroidered end framing the neckline symmetrically." },
  { kind: "dupatta_placement", slug: "dupatta-one-shoulder", name: "One shoulder", description: "Whole dupatta over the left shoulder.", taxonomySlugs: ["womens-dupatta", "womens-kurti", "womens-salwar-kameez"], promptFragment: "Full dupatta taken over one shoulder, hanging in an unbroken length down the front and back." },
  { kind: "dupatta_placement", slug: "dupatta-front-diagonal", name: "Diagonal across the torso", description: "From the left shoulder across the bust to the right hip.", taxonomySlugs: ["womens-dupatta", "womens-kurta-set"], promptFragment: "Dupatta worn diagonally across the torso from the left shoulder toward the right hip, pinned at the shoulder." },
  { kind: "dupatta_placement", slug: "dupatta-pallu-over-shoulder", name: "Pallu style with pleats", description: "Dupatta pleated like a saree pallu over the left shoulder.", taxonomySlugs: ["womens-dupatta", "womens-lehenga"], promptFragment: "Dupatta pleated like a saree pallu and laid over the left shoulder, with the decorated border gathered into a crisp edge." },
  { kind: "dupatta_placement", slug: "dupatta-hood", name: "Over the head", description: "Dupatta drawn up over the head for ceremonial looks.", taxonomySlugs: ["womens-dupatta", "womens-lehenga-bridal", "womens-sharara-set"], compatibility: { occasions: ["wedding", "religious"] }, promptFragment: "Dupatta drawn loosely over the head as a veil, held at the shoulders, framing the face without covering it." },
  { kind: "dupatta_placement", slug: "dupatta-back-drape", name: "Behind, open", description: "Both ends brought to the front and the middle laid behind the neck.", taxonomySlugs: ["womens-dupatta", "womens-kurti"], promptFragment: "Dupatta laid open behind the neck with both ends brought forward, hanging loose on either side of the body." },
  { kind: "dupatta_placement", slug: "dupatta-tucked-side", name: "Tucked at the waist", description: "One end tucked into the waistband, the rest over the shoulder.", taxonomySlugs: ["womens-dupatta", "womens-ghagra", "womens-lehenga"], promptFragment: "Dupatta tucked into the waistband on one side, with the remaining length taken over the shoulder and the tail pinned at the hip." },
  { kind: "dupatta_placement", slug: "dupatta-crossed-front", name: "Crossed in front", description: "Ends crossed and pinned at the bust.", taxonomySlugs: ["womens-dupatta", "womens-anarkali"], promptFragment: "Dupatta crossed in front beneath the bust and pinned at each shoulder, forming a draped front panel over the outfit." },
  { kind: "dupatta_placement", slug: "dupatta-neck-frame", name: "Framing the neckline", description: "Short fold laid across the collarbone only.", taxonomySlugs: ["womens-dupatta", "womens-blouse-choli"], promptFragment: "Dupatta folded into a narrow band that frames the neckline and falls just past the shoulders." },
  { kind: "dupatta_placement", slug: "dupatta-wrist", name: "Held at the wrist", description: "Draped over the forearm for a relaxed editorial look.", taxonomySlugs: ["womens-dupatta", "womens-kurta-set"], promptFragment: "Dupatta laid over the forearm and held lightly at the wrist, the length falling to just above the knee." },
  { kind: "dupatta_placement", slug: "dupatta-belt-tuck", name: "Belted at the waist", description: "Dupatta gathered and held by a waist belt.", taxonomySlugs: ["womens-dupatta", "womens-kurti", "womens-maxi-dress"], promptFragment: "Dupatta draped over the shoulders and gathered at the waist beneath a wide belt, the fabric ruched above it." },
  { kind: "dupatta_placement", slug: "dupatta-shoulder-roll", name: "Rolled shoulder", description: "Edge rolled along the shoulder for structure.", taxonomySlugs: ["womens-dupatta", "womens-salwar-kameez"], promptFragment: "Dupatta with its edge rolled tightly along the shoulder line so the fabric sits flat and structured rather than falling loose." },
  /* ---------------- regional / layering looks ---------------- */
  { kind: "regional_look", slug: "look-punjabi-lambi", name: "Punjabi lambi dupatta with salwar", region: "Punjab", taxonomySlugs: ["womens-salwar-kameez", "womens-salwar-patiala"], promptFragment: "Punjabi styling: a long lambi dupatta worn across both shoulders over a patiala salwar suit, the fabric gathered at the waist." },
  { kind: "regional_look", slug: "look-kanjeevaram-temple", name: "Kanjeevaram with temple borders", region: "Tamil Nadu", taxonomySlugs: ["womens-saree-kanjeevaram", "womens-saree-silk"], promptFragment: "Heavy Kanjeevaram silk with contrast temple borders and a gold zari pallu, worn with the silk held crisp and structured at the shoulder." },
  { kind: "layering", slug: "layer-angrakha-over-kurta", name: "Angrakha over a straight kurta", taxonomySlugs: ["mens-kurta", "womens-kurti-angrakha"], promptFragment: "Layered styling: an Angrakha-style overlapping panel worn over a straight kurta, the tie fastening visible at the shoulder." },
  { kind: "layering", slug: "layer-stole-over-sherwani", name: "Stole over a sherwani", taxonomySlugs: ["mens-sherwani", "womens-dupatta"], promptFragment: "A matching embroidered stole laid over the shoulders of a sherwani, both ends falling evenly in front." },
];

/** Idempotent: refreshes copy and fragments, keeps admin tweaks it has not touched. */
export async function seedWearStyles(db: Db): Promise<number> {
  for (const [index, style] of WEAR_STYLE_SEEDS.entries()) {
    const existing = await db
      .select({ id: wearStyles.id })
      .from(wearStyles)
      .where(eq(wearStyles.slug, style.slug))
      .limit(1);
    const values = {
      kind: style.kind,
      slug: style.slug,
      name: style.name,
      description: style.description ?? null,
      region: style.region ?? null,
      taxonomySlugs: style.taxonomySlugs ?? [],
      compatibility: style.compatibility ?? {},
      promptFragment: style.promptFragment,
      drapeSteps: style.drapeSteps ?? [],
      isActive: true,
      sortOrder: style.sortOrder ?? index,
    };
    if (existing.length > 0) {
      await db.update(wearStyles).set(values).where(eq(wearStyles.id, existing[0].id));
    } else {
      await db.insert(wearStyles).values(values);
    }
  }
  return WEAR_STYLE_SEEDS.length;
}
