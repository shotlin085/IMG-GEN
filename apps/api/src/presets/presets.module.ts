import {
  BadRequestException,
  Body,
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
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { assets, garmentProfiles, garmentTaxonomy, studioPresets } from "@shotlin/database";
import { z } from "zod";
import { AuthGuard, parseWith, type SessionUser } from "../common";
import { AuthModule } from "../auth/auth.module";
import { DB, STORAGE, type ApiDb } from "../infrastructure";
import type { Storage } from "@shotlin/platform";
import type { AuthedRequest } from "../types";

/**
 * Deliberately narrow: a preset may only carry values the job request already
 * validates. Anything else would be a setting that looks saveable but is never
 * read by the pipeline.
 */
const presetPayloadSchema = z
  .object({
    environmentPresetId: z.string().uuid().nullable().optional(),
    characterId: z.string().uuid().nullable().optional(),
    garmentProfileId: z.string().uuid().nullable().optional(),
    wearStyleId: z.string().uuid().nullable().optional(),
    pose: z.string().min(1).max(60).optional(),
    framing: z.string().min(1).max(60).optional(),
    aspectRatio: z.string().min(1).max(30).optional(),
    resolution: z.enum(["1k", "2k", "4k"]).optional(),
    outputCount: z.number().int().min(1).max(5).optional(),
    cameraAngles: z.array(z.string().min(1).max(40)).max(5).optional(),
    sceneKeys: z.array(z.string().min(1).max(80)).max(20).optional(),
    ageAppearance: z.string().min(2).max(60).optional(),
    heightAppearance: z.string().min(2).max(60).optional(),
  })
  .strict();

const presetSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(["generation", "brand"]).default("generation"),
  payload: presetPayloadSchema.default({}),
  notes: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
});

const presetUpdateSchema = presetSchema.partial();

@Injectable()
class PresetsService {
  constructor(
    @Inject(DB) private db: ApiDb,
    @Inject(STORAGE) private storage: Storage,
  ) {}

  /* ------------------------- presets ------------------------- */

  list(user: SessionUser, kind?: string) {
    const owner = eq(studioPresets.ownerId, user.id);
    const where = kind === "generation" || kind === "brand" ? and(owner, eq(studioPresets.kind, kind)) : owner;
    return this.db
      .select()
      .from(studioPresets)
      .where(where)
      .orderBy(desc(studioPresets.isDefault), asc(studioPresets.name));
  }

  async create(user: SessionUser, body: unknown) {
    const input = parseWith(presetSchema, body);
    if (input.isDefault) await this.clearDefault(user, input.kind);
    const inserted = await this.db
      .insert(studioPresets)
      .values({ ...input, ownerId: user.id })
      .returning();
    return inserted[0];
  }

  async update(user: SessionUser, id: string, body: unknown) {
    const input = parseWith(presetUpdateSchema, body);
    const owned = await this.db
      .select({ id: studioPresets.id, kind: studioPresets.kind })
      .from(studioPresets)
      .where(and(eq(studioPresets.id, id), eq(studioPresets.ownerId, user.id)))
      .limit(1);
    if (owned.length === 0) throw new NotFoundException("Preset not found");
    if (input.isDefault) await this.clearDefault(user, input.kind ?? owned[0].kind);
    const updated = await this.db
      .update(studioPresets)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(studioPresets.id, id))
      .returning();
    return updated[0];
  }

  async remove(user: SessionUser, id: string) {
    const deleted = await this.db
      .delete(studioPresets)
      .where(and(eq(studioPresets.id, id), eq(studioPresets.ownerId, user.id)))
      .returning({ id: studioPresets.id });
    if (deleted.length === 0) throw new NotFoundException("Preset not found");
    return { deleted: true };
  }

  private async clearDefault(user: SessionUser, kind: "generation" | "brand") {
    await this.db
      .update(studioPresets)
      .set({ isDefault: false })
      .where(and(eq(studioPresets.ownerId, user.id), eq(studioPresets.kind, kind)));
  }

  /* ---------------------- garment library ---------------------- */

  /** Saved garment profiles with a viewable preview and the taxonomy name. */
  async library(user: SessionUser) {
    const rows = await this.db
      .select({
        profile: garmentProfiles,
        previewAssetId: assets.id,
        bucket: assets.bucket,
        objectKey: assets.objectKey,
        taxonomyName: garmentTaxonomy.name,
        taxonomySlug: garmentTaxonomy.slug,
      })
      .from(garmentProfiles)
      .innerJoin(assets, eq(assets.id, garmentProfiles.assetId))
      .leftJoin(garmentTaxonomy, eq(garmentTaxonomy.id, garmentProfiles.taxonomyNodeId))
      .where(eq(garmentProfiles.ownerId, user.id))
      .orderBy(desc(garmentProfiles.isFavorite), asc(garmentProfiles.title), desc(garmentProfiles.createdAt));

    const library = [];
    for (const row of rows) {
      let previewUrl: string | null = null;
      try {
        previewUrl = await this.storage.presignGet(row.bucket, row.objectKey, 3600);
      } catch {
        // A missing object must not break the whole library listing.
      }
      library.push({
        id: row.profile.id,
        assetId: row.profile.assetId,
        title: row.profile.title,
        isFavorite: row.profile.isFavorite,
        status: row.profile.status,
        detection: row.profile.detection,
        confirmedAttributes: row.profile.confirmedAttributes,
        confidence: row.profile.confidence,
        taxonomyNodeId: row.profile.taxonomyNodeId,
        taxonomyName: row.taxonomyName,
        taxonomySlug: row.taxonomySlug,
        previewUrl,
        createdAt: row.profile.createdAt,
        updatedAt: row.profile.updatedAt,
      });
    }
    return { garments: library };
  }

  async updateProfile(user: SessionUser, id: string, body: unknown) {
    const input = parseWith(
      z.object({
        title: z.string().trim().max(120).nullable().optional(),
        isFavorite: z.boolean().optional(),
      }),
      body,
    );
    if (input.title === "" ) throw new BadRequestException("Give the garment a name or clear it");
    const owned = await this.db
      .select({ id: garmentProfiles.id })
      .from(garmentProfiles)
      .where(and(eq(garmentProfiles.id, id), eq(garmentProfiles.ownerId, user.id)))
      .limit(1);
    if (owned.length === 0) throw new NotFoundException("Garment not found");
    const updated = await this.db
      .update(garmentProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(garmentProfiles.id, id))
      .returning();
    return updated[0];
  }

  async removeProfile(user: SessionUser, id: string) {
    const deleted = await this.db
      .delete(garmentProfiles)
      .where(and(eq(garmentProfiles.id, id), eq(garmentProfiles.ownerId, user.id)))
      .returning({ id: garmentProfiles.id });
    if (deleted.length === 0) throw new NotFoundException("Garment not found");
    return { deleted: true };
  }
}

@Controller("/presets")
@UseGuards(AuthGuard)
class PresetsController {
  constructor(private service: PresetsService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Query("kind") kind?: string) {
    return this.service.list(req.user!, kind);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.create(req.user!, body);
  }

  @Patch("/:id")
  update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.service.update(req.user!, id, body);
  }

  @Delete("/:id")
  remove(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.remove(req.user!, id);
  }
}

@Controller("/garments")
@UseGuards(AuthGuard)
class GarmentLibraryController {
  constructor(private service: PresetsService) {}

  @Get("/library")
  library(@Req() req: AuthedRequest) {
    return this.service.library(req.user!);
  }

  @Patch("/library/:id")
  update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.service.updateProfile(req.user!, id, body);
  }

  @Delete("/library/:id")
  remove(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.removeProfile(req.user!, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PresetsController, GarmentLibraryController],
  providers: [PresetsService],
})
export class PresetsModule {}
