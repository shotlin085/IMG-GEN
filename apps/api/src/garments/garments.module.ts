import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { isUniqueViolation } from "../unique-violation";
import { createHash } from "node:crypto";
import {
  assets,
  garmentProfiles,
  garmentTaxonomy,
  modelRegistry,
  wearStyles,
} from "@shotlin/database";
import { resolveProviders } from "@shotlin/providers";
import { z } from "zod";
import { AuthGuard, AdminGuard, parseWith, type SessionUser } from "../common";
import { AuthModule } from "../auth/auth.module";
import { AdminModule } from "../admin/admin.module";
import { AdminService } from "../admin/admin.service";
import { DB, STORAGE, type ApiDb } from "../infrastructure";
import type { Storage } from "@shotlin/platform";
import type { AuthedRequest } from "../types";

const GARMENT_TYPE_TO_SLUG: Record<string, string> = {
  saree: "womens-saree",
  lehenga: "womens-lehenga",
  kurta: "mens-kurta",
  kurti: "womens-kurti",
  dress: "womens-midi-dress",
  shirt: "mens-shirt",
  top: "womens-top",
  menswear: "mens-kurta",
};

const analyzeSchema = z.object({ assetId: z.string().uuid() });

const confirmSchema = z.object({
  status: z.enum(["confirmed", "corrected"]),
  confirmedAttributes: z.record(z.string(), z.unknown()).default({}),
  taxonomyNodeId: z.string().uuid().nullable().optional(),
});

const taxonomyNodeSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  category: z.enum(["women", "men", "kids", "unisex"]),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  aliases: z.array(z.string().min(1).max(120)).max(20).default([]),
  description: z.string().max(500).optional(),
  compatibility: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().min(0).default(0),
});

const taxonomyUpdateSchema = taxonomyNodeSchema.partial().omit({ category: true, slug: true });

const wearStyleSchema = z.object({
  kind: z.enum(["saree_drape", "dupatta_placement", "regional_look", "layering"]),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  region: z.string().max(120).optional(),
  taxonomySlugs: z.array(z.string().min(2).max(120)).max(40).default([]),
  compatibility: z.record(z.string(), z.unknown()).default({}),
  promptFragment: z.string().min(20).max(1200),
  drapeSteps: z.array(z.string().min(2).max(200)).max(8).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

const wearStyleUpdateSchema = wearStyleSchema.partial().omit({ slug: true });

type TaxonomyRow = typeof garmentTaxonomy.$inferSelect;

@Injectable()
class GarmentsService {
  constructor(
    @Inject(DB) private db: ApiDb,
    @Inject(STORAGE) private storage: Storage,
    private admin: AdminService,
  ) {}

  async taxonomyTree() {
    const rows = await this.db
      .select()
      .from(garmentTaxonomy)
      .where(eq(garmentTaxonomy.isActive, true))
      .orderBy(asc(garmentTaxonomy.sortOrder), asc(garmentTaxonomy.name));
    const byParent = new Map<string | null, TaxonomyRow[]>();
    for (const row of rows) {
      const list = byParent.get(row.parentId) ?? [];
      list.push(row);
      byParent.set(row.parentId, list);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((row) => ({
        id: row.id,
        parentId: row.parentId,
        category: row.category,
        slug: row.slug,
        name: row.name,
        aliases: row.aliases,
        description: row.description,
        compatibility: row.compatibility,
        children: build(row.id),
      }));
    return build(null);
  }

  listProfiles(user: SessionUser) {
    return this.db
      .select()
      .from(garmentProfiles)
      .where(eq(garmentProfiles.ownerId, user.id))
      .orderBy(asc(garmentProfiles.createdAt));
  }

  /** Ownership check is IDOR protection: only the owner's row (or an admin) passes. */
  private async ownedAsset(user: SessionUser, assetId: string) {
    const where =
      user.role === "admin"
        ? eq(assets.id, assetId)
        : and(eq(assets.id, assetId), eq(assets.userId, user.id));
    const rows = await this.db.select().from(assets).where(where).limit(1);
    const asset = rows[0];
    if (!asset) throw new NotFoundException("Asset not found");
    if (asset.validationStatus !== "usable") {
      throw new BadRequestException("Upload is not validated yet — complete the upload first");
    }
    if (asset.kind !== "garment_reference") {
      throw new BadRequestException("Only garment reference photos can be analyzed");
    }
    if (!asset.checksum) {
      throw new BadRequestException("Asset has no content checksum — re-upload");
    }
    return asset;
  }

  async analyze(user: SessionUser, body: unknown) {
    const { assetId } = parseWith(analyzeSchema, body);
    const asset = await this.ownedAsset(user, assetId);
    const fingerprint = createHash("sha256")
      .update(`${asset.checksum}:${asset.sizeBytes}`)
      .digest("hex");

    const cached = await this.db
      .select()
      .from(garmentProfiles)
      .where(
        and(
          eq(garmentProfiles.ownerId, user.id),
          eq(garmentProfiles.fingerprint, fingerprint),
        ),
      )
      .limit(1);
    if (cached.length > 0) return { profile: cached[0], cached: true };

    const models = await this.db
      .select()
      .from(modelRegistry)
      .where(and(eq(modelRegistry.role, "vision_analyzer"), eq(modelRegistry.isEnabled, true)))
      .limit(1);
    const model = models[0];
    if (!model) throw new BadRequestException("No vision analyzer model is configured");

    const buffer = await this.storage.getObject(asset.bucket, asset.objectKey);
    const providers = resolveProviders();
    const result = await providers.analyzeGarment({
      references: [{ data: buffer, mimeType: asset.mimeType }],
      systemPrompt:
        "You are a garment analysis expert for a fashion photography studio. " +
        "Analyze the attached garment reference photo and return the Garment Truth Sheet JSON. " +
        "Classify into the studio taxonomy (women / men / kids garment families, including Indian and traditional garments).",
      model: {
        id: model.id,
        provider: model.provider as "openrouter" | "mock",
        modelId: model.modelId,
        role: model.role,
      },
      timeoutMs: 90_000,
    });

    const truth = result.data as Record<string, unknown>;
    const taxonomySlug = GARMENT_TYPE_TO_SLUG[String(truth.garmentType)] ?? null;
    let taxonomyNodeId: string | null = null;
    if (taxonomySlug) {
      const nodes = await this.db
        .select({ id: garmentTaxonomy.id })
        .from(garmentTaxonomy)
        .where(eq(garmentTaxonomy.slug, taxonomySlug))
        .limit(1);
      taxonomyNodeId = nodes[0]?.id ?? null;
    }

    const inserted = await this.db
      .insert(garmentProfiles)
      .values({
        ownerId: user.id,
        assetId: asset.id,
        taxonomyNodeId,
        fingerprint,
        source: "ai",
        status: "auto_detected",
        detection: truth,
        confidence: {
          overall: typeof truth.confidence === "number" ? truth.confidence / 100 : null,
        },
        confirmedAttributes: {},
      })
      // Two uploads of the same bytes in the same instant both miss the cache;
      // the unique (owner, fingerprint) index decides the winner and the loser
      // returns it instead of erroring.
      .onConflictDoNothing({
        target: [garmentProfiles.ownerId, garmentProfiles.fingerprint],
      })
      .returning();
    if (inserted.length > 0) return { profile: inserted[0], cached: false };
    const winner = await this.db
      .select()
      .from(garmentProfiles)
      .where(
        and(
          eq(garmentProfiles.ownerId, user.id),
          eq(garmentProfiles.fingerprint, fingerprint),
        ),
      )
      .limit(1);
    return { profile: winner[0], cached: true };
  }

  async confirm(user: SessionUser, profileId: string, body: unknown) {
    const input = parseWith(confirmSchema, body);
    const rows = await this.db
      .select()
      .from(garmentProfiles)
      .where(eq(garmentProfiles.id, profileId))
      .limit(1);
    const profile = rows[0];
    if (!profile || (profile.ownerId !== user.id && user.role !== "admin")) {
      throw new NotFoundException("Garment profile not found");
    }
    if (input.taxonomyNodeId) {
      const nodes = await this.db
        .select({ id: garmentTaxonomy.id })
        .from(garmentTaxonomy)
        .where(eq(garmentTaxonomy.id, input.taxonomyNodeId))
        .limit(1);
      if (nodes.length === 0) throw new BadRequestException("Unknown taxonomy node");
    }
    const updated = await this.db
      .update(garmentProfiles)
      .set({
        status: input.status,
        confirmedAttributes: input.confirmedAttributes,
        taxonomyNodeId: input.taxonomyNodeId ?? profile.taxonomyNodeId,
        correctedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(garmentProfiles.id, profileId))
      .returning();
    return updated[0];
  }

  /**
   * Wear styles for a garment. Matching is by taxonomy slug so an admin can
   * extend the library without a code change; `for` may name any node in the
   * family path.
   */
  async wearStyles(forRef?: string | null) {
    const rows = await this.db
      .select()
      .from(wearStyles)
      .where(eq(wearStyles.isActive, true))
      .orderBy(asc(wearStyles.sortOrder));
    if (!forRef) return rows;
    // The studio knows a node id; the library is keyed by taxonomy slug.
    let forSlug = forRef;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(forRef)) {
      const node = await this.db
        .select({ slug: garmentTaxonomy.slug })
        .from(garmentTaxonomy)
        .where(eq(garmentTaxonomy.id, forRef))
        .limit(1);
      forSlug = node[0]?.slug ?? "";
    }
    const matches = (row: typeof wearStyles.$inferSelect) => row.taxonomySlugs.includes(forSlug);
    const matched = rows.filter(matches);
    return matched.length > 0
      ? matched
      : // Nothing registered for this exact node: fall back to generic
        // placements so the control is never an empty, dead picker.
        rows.filter((row) => row.kind === "dupatta_placement" || row.kind === "layering");
  }

  async createWearStyle(body: unknown, userId: string) {
    const input = parseWith(wearStyleSchema, body);
    let inserted;
    try {
      inserted = await this.db
        .insert(wearStyles)
        .values({ ...input, createdBy: userId })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("A wear style with that slug already exists");
      throw error;
    }
    await this.admin.audit(userId, "wear_style.create", "wear_style", inserted[0].id, {
      slug: inserted[0].slug,
      kind: inserted[0].kind,
    });
    return inserted[0];
  }

  async updateWearStyle(id: string, body: unknown, actorId: string) {
    const input = parseWith(wearStyleUpdateSchema, body);
    let updated;
    try {
      updated = await this.db
        .update(wearStyles)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(wearStyles.id, id))
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("A wear style with that slug already exists");
      throw error;
    }
    if (updated.length === 0) throw new NotFoundException("Wear style not found");
    await this.admin.audit(actorId, "wear_style.update", "wear_style", id, input as Record<string, unknown>);
    return updated[0];
  }

  async deleteWearStyle(id: string, actorId: string) {
    await this.db.delete(wearStyles).where(eq(wearStyles.id, id));
    await this.admin.audit(actorId, "wear_style.delete", "wear_style", id, {});
    return { deleted: true };
  }

  async createNode(body: unknown, actorId: string) {
    const input = parseWith(taxonomyNodeSchema, body);
    if (input.parentId) {
      const parents = await this.db
        .select()
        .from(garmentTaxonomy)
        .where(eq(garmentTaxonomy.id, input.parentId))
        .limit(1);
      if (parents.length === 0) throw new BadRequestException("Parent node not found");
    }
    let inserted;
    try {
      inserted = await this.db.insert(garmentTaxonomy).values(input).returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("A taxonomy node with that slug already exists");
      throw error;
    }
    await this.admin.audit(actorId, "taxonomy.create", "garment_taxonomy", inserted[0].id, {
      slug: inserted[0].slug,
      category: inserted[0].category,
    });
    return inserted[0];
  }

  async updateNode(id: string, body: unknown, actorId: string) {
    const input = parseWith(taxonomyUpdateSchema, body);
    let updated;
    try {
      updated = await this.db
        .update(garmentTaxonomy)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(garmentTaxonomy.id, id))
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("A taxonomy node with that slug already exists");
      throw error;
    }
    if (updated.length === 0) throw new NotFoundException("Taxonomy node not found");
    await this.admin.audit(actorId, "taxonomy.update", "garment_taxonomy", id, input as Record<string, unknown>);
    return updated[0];
  }

  async deleteNode(id: string, actorId: string) {
    await this.db.delete(garmentTaxonomy).where(eq(garmentTaxonomy.id, id));
    await this.admin.audit(actorId, "taxonomy.delete", "garment_taxonomy", id, {});
    return { deleted: true };
  }
}

@Controller("/garments")
@UseGuards(AuthGuard)
class GarmentsController {
  constructor(private service: GarmentsService) {}

  @Get("/taxonomy/tree")
  taxonomyTree() {
    return this.service.taxonomyTree();
  }

  @Get("/wear-styles")
  listWearStyles(@Query("for") forSlug?: string) {
    return this.service.wearStyles(forSlug ?? null);
  }

  @Get("/profiles")
  listProfiles(@Req() req: AuthedRequest) {
    return this.service.listProfiles(req.user!);
  }

  @Post("/analyze")
  analyze(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.analyze(req.user!, body);
  }

  @Patch("/profiles/:id")
  confirm(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.confirm(req.user!, id, body);
  }
}

@Controller("/admin/garment-taxonomy")
@UseGuards(AdminGuard)
class GarmentTaxonomyAdminController {
  constructor(private service: GarmentsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.createNode(body, req.user!.id);
  }

  @Put("/:id")
  update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.service.updateNode(id, body, req.user!.id);
  }

  @Delete("/:id")
  remove(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.deleteNode(id, req.user!.id);
  }
}

@Controller("/admin/wear-styles")
@UseGuards(AdminGuard)
class WearStyleAdminController {
  constructor(private service: GarmentsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.createWearStyle(body, req.user!.id);
  }

  @Put("/:id")
  update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.service.updateWearStyle(id, body, req.user!.id);
  }

  @Delete("/:id")
  remove(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.deleteWearStyle(id, req.user!.id);
  }
}

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [GarmentsController, GarmentTaxonomyAdminController, WearStyleAdminController],
  providers: [GarmentsService],
})
export class GarmentsModule {}
