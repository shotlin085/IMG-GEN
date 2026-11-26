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
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { assets, characters } from "@shotlin/database";
import { isMinorAppearance } from "@shotlin/core";
import { z } from "zod";
import { AuthGuard, parseWith } from "../common";
import { AuthModule } from "../auth/auth.module";
import { DB, type ApiDb } from "../infrastructure";
import type { AuthedRequest } from "../types";

/** Bumping this invalidates stored acknowledgements on purpose: the customer must re-confirm. */
export const CONSENT_STATEMENT_VERSION = "2026-09-01";

const modelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  attributes: z
    .object({
      gender: z.enum(["female", "male", "other"]).default("other"),
      ageAppearance: z.string().min(2).max(60),
      height: z.enum(["petite", "average", "tall"]).default("average"),
      build: z.string().trim().max(60).default("medium"),
      skinTone: z.string().trim().max(60).optional(),
      hair: z.string().trim().max(120).optional(),
    })
    .default({ gender: "other", ageAppearance: "adult", height: "average", build: "medium" }),
  previewAssetId: z.string().uuid().optional(),
  /** Generated (synthetic) identity rather than a photo of a real person. */
  synthetic: z.boolean().default(false),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Confirm that you have the right to use this model's likeness" }),
  }),
  guardianConfirmed: z.boolean().default(false),
});

@Injectable()
class ModelLibraryService {
  constructor(@Inject(DB) private db: ApiDb) {}

  /** Catalogue (preset + synthetic studio models) plus the caller's own models. */
  async browse(userId: string) {
    return this.db
      .select()
      .from(characters)
      .where(and(eq(characters.isEnabled, true)))
      .orderBy(asc(characters.sortOrder), asc(characters.name))
      .then((rows) =>
        rows
          .filter((row) => row.isPreset || row.ownerId === null || row.ownerId === userId)
          .map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            attributes: row.attributes,
            originKind: row.originKind,
            isPreset: row.isPreset,
            mine: row.ownerId === userId,
            previewAssetId: row.previewAssetId,
            consentConfirmedAt: row.consentConfirmedAt,
            guardianConfirmedAt: row.guardianConfirmedAt,
            createdAt: row.createdAt,
          })),
      );
  }

  async create(userId: string, body: unknown) {
    const input = parseWith(modelSchema, body);
    const minorSubject = isMinorAppearance(input.attributes.ageAppearance);
    if (minorSubject && !input.guardianConfirmed) {
      throw new BadRequestException(
        "An under-18 model needs a guardian or rights-holder confirmation before it can be used.",
      );
    }
    if (input.previewAssetId) {
      const owned = await this.db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.id, input.previewAssetId), eq(assets.userId, userId)))
        .limit(1);
      if (owned.length === 0) throw new BadRequestException("Reference image not found");
    }
    const inserted = await this.db
      .insert(characters)
      .values({
        name: input.name,
        description: input.description ?? null,
        attributes: input.attributes,
        previewAssetId: input.previewAssetId ?? null,
        originKind: input.synthetic ? "synthetic" : "custom",
        isPreset: false,
        ownerId: userId,
        consentConfirmedAt: new Date(),
        consentStatementVersion: CONSENT_STATEMENT_VERSION,
        guardianConfirmedAt: minorSubject ? new Date() : null,
      })
      .returning();
    return inserted[0];
  }

  async remove(userId: string, id: string) {
    const rows = await this.db
      .select({ id: characters.id, ownerId: characters.ownerId, originKind: characters.originKind })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);
    const row = rows[0];
    // IDOR: a customer can only ever delete their own non-preset model.
    if (!row || row.ownerId !== userId || row.originKind === "preset") {
      throw new NotFoundException("Model not found");
    }
    await this.db.delete(characters).where(eq(characters.id, id));
    return { deleted: true };
  }
}

@Controller("/customer/model-library")
@UseGuards(AuthGuard)
class ModelLibraryController {
  constructor(private service: ModelLibraryService) {}

  @Get()
  browse(@Req() req: AuthedRequest) {
    return this.service.browse(req.user!.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.create(req.user!.id, body);
  }

  @Delete("/:id")
  remove(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.remove(req.user!.id, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ModelLibraryController],
  providers: [ModelLibraryService],
})
export class ModelLibraryModule {}
