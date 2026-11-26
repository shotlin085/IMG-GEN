import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import {
  assets,
  budgetRules,
  characters,
  wearStyles,
  environmentPresets,
  executionManifests,
  feedback,
  generationCandidates,
  jobAttempts,
  jobInputs as jobInputsTable,
  jobOutputs,
  jobStateEvents,
  jobs,
  modelRegistry,
  promptVersions,
  skillRules,
  skillVersions,
  workflowNodeConfigs,
  workflowNodes,
  workflowVersions,
  workflows,
} from "@shotlin/database";
import { CUSTOMER_FACING_STATES, MAX_ANGLES, resolveAngleSet, AGE_APPEARANCE_VALUES, ASPECT_RATIO_VALUES, POSE_VALUES, FRAMING_VALUES, FEEDBACK_REASON_VALUES, isMinorAppearance, evaluateChildSafety } from "@shotlin/core";
import type { Storage } from "@shotlin/platform";
import { z } from "zod";
import { AuthGuard, parseWith } from "../common";
import { GenerationRateLimitGuard } from "./generation-rate-limit.guard";
import type { AuthedRequest, Reply } from "../types";
import {
  DB,
  GENERATION_QUEUE_PROV,
  STORAGE,
  type ApiDb,
} from "../infrastructure";
import { AuthModule } from "../auth/auth.module";

/** The transaction handle drizzle passes into `db.transaction(async (tx) => ...)`. */
type ApiTx = Parameters<Parameters<ApiDb["transaction"]>[0]>[0];

const detailKindSchema = z.enum(["border", "embroidery", "pattern", "neckline", "sleeve", "pallu", "other"]);

const createJobSchema = z.object({
  mainGarmentAssetId: z.string().uuid(),
  detailReferences: z
    .array(z.object({ assetId: z.string().uuid(), kind: detailKindSchema.default("other") }))
    .max(5)
    .default([]),
  inputType: z.enum(["photo", "drawing", "design_reference"]).default("photo"),
  characterId: z.string().uuid().nullable().optional(),
  characterAssetId: z.string().uuid().nullable().optional(),
  genderPresentation: z.enum(["female", "male", "other"]).nullable().optional(),
  ageAppearance: z
    .enum(AGE_APPEARANCE_VALUES as unknown as [string, ...string[]])
    .default("mid-20s"),
  heightAppearance: z.string().min(1).max(60).default("average"),
  pose: z.enum(POSE_VALUES as unknown as [string, ...string[]]).default("auto"),
  framing: z.enum(FRAMING_VALUES as unknown as [string, ...string[]]).default("auto"),
  /** Optional drape / dupatta placement. Its prompt fragment is snapshotted. */
  wearStyleId: z.string().uuid().nullable().optional(),
  environmentPresetId: z.string().uuid().nullable().optional(),
  /** Explicit image-generation model choice. Null/omitted = use the production workflow's configured default. */
  imageModelId: z.string().uuid().nullable().optional(),
  resolution: z.enum(["1k", "2k", "4k"]).default("2k"),
  aspectRatio: z.enum(ASPECT_RATIO_VALUES as unknown as [string, ...string[]]).default("portrait"),
  outputCount: z.number().int().min(1).max(MAX_ANGLES).default(1),
  /** Optional explicit camera angles; defaults are derived from outputCount. */
  cameraAngles: z.array(z.string()).max(MAX_ANGLES).nullable().optional(),
});

const feedbackSchema = z.object({
  rating: z.enum(["good", "needs_improvement"]),
  reasons: z
    .array(z.enum(FEEDBACK_REASON_VALUES as unknown as [string, ...string[]]))
    .max(FEEDBACK_REASON_VALUES.length)
    .default([]),
  comment: z.string().max(2000).optional(),
});

const MAX_BATCH_VARIANTS = 8;

const batchSchema = z.object({
  garmentAssetId: z.string().uuid(),
  /** Preset values applied to every variant; a variant can override any of them. */
  base: z
    .object({
      characterId: z.string().uuid().nullable().optional(),
      characterAssetId: z.string().uuid().nullable().optional(),
      environmentPresetId: z.string().uuid().nullable().optional(),
      imageModelId: z.string().uuid().nullable().optional(),
      resolution: z.enum(["1k", "2k", "4k"]).optional(),
      aspectRatio: z.string().min(1).max(30).optional(),
      pose: z.string().min(1).max(60).optional(),
      framing: z.string().min(1).max(60).optional(),
      ageAppearance: z.string().min(2).max(60).optional(),
      heightAppearance: z.string().min(2).max(60).optional(),
      wearStyleId: z.string().uuid().nullable().optional(),
      detailReferences: z
        .array(z.object({ assetId: z.string().uuid(), kind: detailKindSchema.default("other") }))
        .max(5)
        .optional(),
    })
    .default({}),
  variants: z
    .array(
      z
        .object({
          label: z.string().trim().max(80).optional(),
          environmentPresetId: z.string().uuid().nullable().optional(),
          pose: z.string().min(1).max(60).optional(),
          framing: z.string().min(1).max(60).optional(),
          wearStyleId: z.string().uuid().nullable().optional(),
          characterId: z.string().uuid().nullable().optional(),
          outputCount: z.number().int().min(1).max(MAX_ANGLES).optional(),
          cameraAngles: z.array(z.string().min(1).max(40)).max(MAX_ANGLES).nullable().optional(),
        })
        .strict(),
    )
    .min(1)
    .max(MAX_BATCH_VARIANTS),
});

const regenerateSchema = z.object({
  /** A single camera angle from the parent job, or omit to redo the whole set. */
  cameraAngle: z.string().min(1).max(60).nullable().optional(),
});

@Injectable()
class JobsService {
  constructor(
    @Inject(DB) private db: ApiDb,
    @Inject(STORAGE) private storage: Storage,
    @Inject(GENERATION_QUEUE_PROV) private queue: Queue,
  ) {}

  async createJob(userId: string, body: unknown, idempotencyKey: string | undefined) {
    const input = parseWith(createJobSchema, body);
    const key = parseWith(
      z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/, "Idempotency-Key must be 16–128 URL-safe characters"),
      idempotencyKey,
    );
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");

    const existing = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.idempotencyKey, key)))
      .limit(1);
    if (existing[0]) {
      if (existing[0].idempotencyFingerprint !== fingerprint) {
        throw new ConflictException("This Idempotency-Key was already used for a different generation request");
      }
      return this.replayIdempotentJob(existing[0]);
    }

    // ---- validate assets belong to the user and are usable ----
    const assetIds = [input.mainGarmentAssetId, ...input.detailReferences.map((d) => d.assetId)];
    if (input.characterAssetId) assetIds.push(input.characterAssetId);
    const assetRows = await this.db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId));
    const owned = new Map(assetRows.map((a) => [a.id, a]));
    for (const id of assetIds) {
      const a = owned.get(id);
      if (!a) throw new BadRequestException(`Asset ${id} not found for this user`);
      if (a.validationStatus !== "usable") {
        throw new BadRequestException(`Asset ${id} is not validated as usable`);
      }
    }

    // ---- per-user daily job limit ----
    const [rules] = await this.db.select().from(budgetRules).limit(1);
    const dailyLimit = rules?.perUserDailyJobLimit ?? 20;
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [{ value: todayCount }] = await this.db
      .select({ value: count() })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), gte(jobs.createdAt, since)));
    if (Number(todayCount) >= dailyLimit) {
      throw new BadRequestException(`Daily job limit reached (${dailyLimit}/24h)`);
    }

    // ---- snapshot the production workflow version ----
    const wfRows = await this.db
      .select({
        versionId: workflowVersions.id,
        workflowId: workflows.id,
        versionNumber: workflowVersions.version,
      })
      .from(workflows)
      .innerJoin(workflowVersions, eq(workflowVersions.workflowId, workflows.id))
      .where(and(eq(workflows.key, "default"), eq(workflowVersions.status, "production")))
      .limit(1);
    const workflowVersionId = wfRows[0]?.versionId;
    if (!workflowVersionId) {
      throw new BadRequestException("No production workflow configured");
    }
    const workflowId = wfRows[0].workflowId;
    const workflowVersionNumber = wfRows[0].versionNumber;

    // ---- character / environment checks ----
    let under18Policy = false;
    if (input.characterId) {
      const c = await this.db
        .select({
          id: characters.id,
          originKind: characters.originKind,
          attributes: characters.attributes,
          guardianConfirmedAt: characters.guardianConfirmedAt,
        })
        .from(characters)
        .where(eq(characters.id, input.characterId))
        .limit(1);
      if (c.length === 0) throw new BadRequestException("Character not found");
      const character = c[0];
      const characterAge =
        typeof character.attributes?.ageAppearance === "string"
          ? character.attributes.ageAppearance
          : null;
      // Either side of the pairing can make the subject a minor.
      under18Policy = isMinorAppearance(characterAge) || isMinorAppearance(input.ageAppearance);
      if (under18Policy && character.originKind === "custom" && !character.guardianConfirmedAt) {
        throw new BadRequestException(
          "This model represents an under-18 person. A guardian or rights-holder confirmation is required before generating.",
        );
      }
    }
    if (input.environmentPresetId) {
      const e = await this.db
        .select({ id: environmentPresets.id, key: environmentPresets.key, name: environmentPresets.name })
        .from(environmentPresets)
        .where(eq(environmentPresets.id, input.environmentPresetId))
        .limit(1);
      if (e.length === 0) throw new BadRequestException("Environment preset not found");
      const sceneDecision = evaluateChildSafety({
        ageAppearance: under18Policy ? input.ageAppearance : null,
        pose: input.pose,
        sceneKey: `${e[0].key} ${e[0].name}`,
      });
      if (sceneDecision.violations.length > 0) {
        throw new BadRequestException(
          `Not used for an under-18 appearance: ${sceneDecision.violations.join(", ")}. ${sceneDecision.substitutions.join("; ")}.`,
        );
      }
    }
    if (input.imageModelId) {
      const m = await this.db
        .select({ id: modelRegistry.id })
        .from(modelRegistry)
        .where(
          and(
            eq(modelRegistry.id, input.imageModelId),
            eq(modelRegistry.role, "image_generator"),
            eq(modelRegistry.isEnabled, true),
          ),
        )
        .limit(1);
      if (m.length === 0) throw new BadRequestException("Selected image model is not available");
    }

    let wearStyleSnapshot: { id: string; slug: string; name: string; promptFragment: string } | null = null;
    if (input.wearStyleId) {
      const w = await this.db
        .select({
          id: wearStyles.id,
          slug: wearStyles.slug,
          name: wearStyles.name,
          promptFragment: wearStyles.promptFragment,
          isActive: wearStyles.isActive,
        })
        .from(wearStyles)
        .where(eq(wearStyles.id, input.wearStyleId))
        .limit(1);
      if (w.length === 0 || !w[0].isActive) throw new BadRequestException("That wear style is not available");
      // The fragment is copied into the snapshot so a later library edit can
      // never rewrite what this job actually asked for.
      wearStyleSnapshot = { id: w[0].id, slug: w[0].slug, name: w[0].name, promptFragment: w[0].promptFragment };
    }

    const selections: Record<string, unknown> = {
      inputType: input.inputType,
      genderPresentation: input.genderPresentation ?? null,
      ageAppearance: input.ageAppearance,
      heightAppearance: input.heightAppearance,
      pose: input.pose,
      framing: input.framing,
      wearStyle: wearStyleSnapshot,
      // Recorded so a historical job shows which safety policy governed it.
      under18Policy,
    };

    let job: typeof jobs.$inferSelect;
    try {
      [job] = await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(jobs)
          .values({
            userId,
            workflowVersionId,
            state: "created",
            requestedResolution: input.resolution,
            aspectRatio: input.aspectRatio,
            outputCount: input.outputCount,
            cameraAngles: resolveAngleSet(input.outputCount, input.cameraAngles),
            imageModelId: input.imageModelId ?? null,
            idempotencyKey: key,
            idempotencyFingerprint: fingerprint,
            characterId: input.characterId ?? null,
            characterAssetId: input.characterAssetId ?? null,
            environmentPresetId: input.environmentPresetId ?? null,
            selections,
          })
          .returning();
        const inputRows: Array<{
          jobId: string;
          assetId: string;
          role: "main_garment" | "detail" | "character";
          detailKind?: (typeof detailKindSchema)["_type"];
        }> = [
          { jobId: inserted.id, assetId: input.mainGarmentAssetId, role: "main_garment" as const },
          ...input.detailReferences.map((d) => ({
            jobId: inserted.id,
            assetId: d.assetId,
            role: "detail" as const,
            detailKind: d.kind,
          })),
        ];
        if (input.characterAssetId) {
          inputRows.push({ jobId: inserted.id, assetId: input.characterAssetId, role: "character" as const });
        }
        await tx.insert(jobInputsTable).values(inputRows);

        await this.createExecutionManifest(tx, {
          jobId: inserted.id,
          workflowId,
          workflowVersionId,
          workflowVersionNumber,
          imageModelId: inserted.imageModelId,
        });

        return [inserted] as const;
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
      const raced = await this.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.idempotencyKey, key)))
        .limit(1);
      if (!raced[0]) throw error;
      if (raced[0].idempotencyFingerprint !== fingerprint) {
        throw new ConflictException("This Idempotency-Key was already used for a different generation request");
      }
      return this.replayIdempotentJob(raced[0]);
    }

    // ---- enqueue ----
    await this.queue.add("generate", { jobId: job.id }, { jobId: job.id });

    return { job: this.toCustomerJob(job) };
  }

  /**
   * Snapshot every runtime-relevant configuration setting for this job at
   * creation time — workflow nodes, model bindings, prompt versions, skill
   * versions, quality thresholds, budget rules, FX rate — into an immutable
   * record. Written inside the same transaction as the job row so job
   * creation and its manifest either both commit or both roll back.
   */
  private async createExecutionManifest(
    tx: ApiTx,
    input: {
      jobId: string;
      workflowId: string;
      workflowVersionId: string;
      workflowVersionNumber: number;
      imageModelId: string | null;
    },
  ): Promise<void> {
    const nodes = await tx
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.workflowVersionId, input.workflowVersionId))
      .orderBy(workflowNodes.sequence);
    const configs = await tx.select().from(workflowNodeConfigs);
    const configByNodeId = new Map(configs.map((c) => [c.nodeId, c]));

    const nodesSnapshot = nodes.map((n) => {
      const config = configByNodeId.get(n.id);
      return {
        nodeKey: n.nodeKey,
        sequence: n.sequence,
        isEnabled: n.isEnabled,
        modelId: config?.modelId ?? null,
        promptVersionId: config?.promptVersionId ?? null,
        timeoutMs: config?.timeoutMs ?? null,
        maxRetries: config?.maxRetries ?? null,
        thresholds: config?.thresholds ?? {},
        settings: config?.settings ?? {},
      };
    });

    const models = await tx.select().from(modelRegistry).where(eq(modelRegistry.isEnabled, true));
    const modelsSnapshot: Record<string, { modelRegistryId: string; provider: string; providerModelId: string }> =
      Object.fromEntries(
        models.map((m) => [m.role, { modelRegistryId: m.id, provider: m.provider, providerModelId: m.modelId }]),
      );
    // Mirrors loadJobData's override in the worker — a customer's explicit
    // model choice takes precedence over the workflow's default binding.
    if (input.imageModelId) {
      const [chosen] = await tx.select().from(modelRegistry).where(eq(modelRegistry.id, input.imageModelId)).limit(1);
      if (chosen) {
        modelsSnapshot[chosen.role] = { modelRegistryId: chosen.id, provider: chosen.provider, providerModelId: chosen.modelId };
      }
    }

    const skills = await tx.select().from(skillVersions).where(eq(skillVersions.status, "production"));
    const rules = await tx.select().from(skillRules).where(eq(skillRules.isEnabled, true));
    const skillsSnapshot = rules
      .map((r) => {
        // Each rule belongs to a skill (not a specific version); resolve it
        // to that skill's current production version, same as the worker.
        const version = skills.find((s) => s.skillId === r.skillId);
        if (!version) return null;
        return {
          skillId: version.skillId,
          skillVersionId: version.id,
          priority: version.priority,
          instructionHash: createHash("sha256").update(version.instruction).digest("hex").slice(0, 16),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const promptVersionIds = [
      ...new Set(nodesSnapshot.map((n) => n.promptVersionId).filter((id): id is string => id !== null)),
    ];
    const prompts = promptVersionIds.length
      ? await tx.select().from(promptVersions).where(inArray(promptVersions.id, promptVersionIds))
      : [];
    const promptsById = new Map(prompts.map((p) => [p.id, { promptId: p.promptId, version: p.version }]));

    const [budget] = await tx.select().from(budgetRules).limit(1);
    if (!budget) throw new Error("Budget rules not seeded");

    const qualityRulesSnapshot = {
      minGarmentFidelity: budget.minGarmentFidelity,
      minCharacterIdentity: budget.minCharacterIdentity,
      minPhotorealism: budget.minPhotorealism,
      minAnatomy: budget.minAnatomy,
      minTechnicalQuality: budget.minTechnicalQuality,
      uncertaintyBand: budget.uncertaintyBand,
      minReviewerConfidence: budget.minReviewerConfidence,
    };
    const budgetRulesSnapshot = {
      hardStopInr: budget.hardStopInr,
      warnInr: budget.warnInr,
      maxAttempts: budget.maxAttempts,
      isSecondReviewEnabled: budget.isSecondReviewEnabled,
    };

    const canonical = JSON.stringify({
      workflowVersionId: input.workflowVersionId,
      nodesSnapshot,
      modelsSnapshot,
      skillsSnapshot,
      qualityRulesSnapshot,
      budgetRulesSnapshot,
      promptsById: Object.fromEntries(promptsById),
      fxRate: budget.usdInrRate,
    });
    const manifestHash = createHash("sha256").update(canonical).digest("hex");

    await tx.insert(executionManifests).values({
      jobId: input.jobId,
      workflowId: input.workflowId,
      workflowVersionId: input.workflowVersionId,
      workflowVersionNumber: input.workflowVersionNumber,
      nodesSnapshot,
      modelsSnapshot,
      skillsSnapshot,
      qualityRulesSnapshot,
      budgetRulesSnapshot,
      fxRate: String(budget.usdInrRate ?? 95.78),
      manifestHash,
    });
  }

  private async replayIdempotentJob(job: typeof jobs.$inferSelect) {
    // A request may have committed the DB transaction just before queue.add failed.
    // Replaying the same key repairs that handoff without creating another job.
    if (job.state === "created" && !(await this.queue.getJob(job.id))) {
      await this.queue.add("generate", { jobId: job.id }, { jobId: job.id });
    }
    return { job: this.toCustomerJob(job), deduplicated: true };
  }

  async getStatus(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);
    const [attempts, stateEvents] = await Promise.all([
      this.db
        .select({ attemptNumber: jobAttempts.attemptNumber, status: jobAttempts.status })
        .from(jobAttempts)
        .where(eq(jobAttempts.jobId, job.id)),
      this.db
        .select({
          toState: jobStateEvents.toState,
          reason: jobStateEvents.reason,
          createdAt: jobStateEvents.createdAt,
        })
        .from(jobStateEvents)
        .where(eq(jobStateEvents.jobId, job.id))
        .orderBy(jobStateEvents.createdAt),
    ]);

    return {
      job: this.toCustomerJob(job),
      attempts: attempts.length,
      isTerminal: CUSTOMER_FACING_STATES[job.state]?.isTerminal ?? false,
      stateEvents,
    };
  }

  async getResult(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);
    const outRows = await this.db
      .select()
      .from(jobOutputs)
      .where(eq(jobOutputs.jobId, job.id))
      .orderBy(jobOutputs.sequence);

    let images: Array<{
      sequence: number;
      cameraAngle: string | null;
      previewUrl: string | null;
      downloads: { png: string | null; jpg: string | null };
    }>;
    let delivery: "final" | "stored_candidate" | "none";

    if (outRows.length) {
      // Finalized: read the delivered set exactly as `finalize` wrote it.
      const outputAssetIds = outRows
        .flatMap((row) => [row.masterAssetId, row.previewAssetId, row.jpgAssetId])
        .filter((assetId): assetId is string => Boolean(assetId));
      const outputAssets = outputAssetIds.length
        ? await this.db.select().from(assets).where(inArray(assets.id, outputAssetIds))
        : [];
      const byId = new Map(outputAssets.map((asset) => [asset.id, asset]));
      const sign = (assetId: string | null | undefined) => {
        const asset = assetId ? byId.get(assetId) : undefined;
        return asset ? this.storage.presignGet(asset.bucket, asset.objectKey, 3600) : null;
      };
      images = await Promise.all(
        outRows.map(async (row) => {
          const [png, previewSigned, jpg] = await Promise.all([
            sign(row.masterAssetId),
            sign(row.previewAssetId),
            sign(row.jpgAssetId),
          ]);
          return {
            sequence: row.sequence,
            cameraAngle: row.cameraAngle,
            previewUrl: previewSigned ?? png,
            downloads: { png, jpg },
          };
        }),
      );
      delivery = "final";
    } else {
      // Not finalized (e.g. stopped for manual review after retries): the
      // generation actually ran and was paid for, so every angle from the
      // most recent attempt must still be visible, not just one arbitrary
      // candidate. Scope strictly to the latest attempt — an earlier retry's
      // candidates must not be mixed in with the current ones.
      const [latestAttempt] = await this.db
        .select({ id: jobAttempts.id })
        .from(jobAttempts)
        .where(eq(jobAttempts.jobId, job.id))
        .orderBy(desc(jobAttempts.attemptNumber))
        .limit(1);

      const candidateRows = latestAttempt
        ? await this.db
            .select({ candidate: generationCandidates, asset: assets })
            .from(generationCandidates)
            .innerJoin(assets, eq(assets.id, generationCandidates.assetId))
            .where(eq(generationCandidates.attemptId, latestAttempt.id))
            .orderBy(generationCandidates.sequence)
        : [];

      images = await Promise.all(
        candidateRows.map(async (row) => ({
          sequence: row.candidate.sequence,
          cameraAngle: row.candidate.cameraAngle,
          previewUrl: await this.storage.presignGet(row.asset.bucket, row.asset.objectKey, 3600),
          downloads: {
            png: await this.storage.presignGet(row.asset.bucket, row.asset.objectKey, 3600),
            jpg: null,
          },
        })),
      );
      delivery = images.length ? "stored_candidate" : "none";
    }

    // Single-image callers keep reading the flat fields; a multi-angle set
    // exposes the anchor frame there and the full set under `images`.
    const anchor = images[0];

    return {
      jobId: job.id,
      state: job.state,
      resolution: job.requestedResolution,
      aspectRatio: job.aspectRatio,
      characterId: job.characterId,
      environmentPresetId: job.environmentPresetId,
      delivery,
      requestedCount: job.outputCount,
      deliveredCount: images.length,
      images,
      previewUrl: anchor?.previewUrl ?? null,
      downloads: {
        png: anchor?.downloads.png ?? null,
        jpg: anchor?.downloads.jpg ?? null,
      },
    };
  }

  async listProjects(userId: string) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(100);

    const projects = [];
    for (const job of rows) {
      let thumbnailUrl: string | null = null;
      if (job.state === "ready") {
        const out = await this.db
          .select()
          .from(jobOutputs)
          .where(eq(jobOutputs.jobId, job.id))
          .orderBy(jobOutputs.sequence)
          .limit(1);
        const previewAssetId = out[0]?.previewAssetId ?? out[0]?.masterAssetId;
        if (previewAssetId) {
          const a = await this.db
            .select()
            .from(assets)
            .where(eq(assets.id, previewAssetId))
            .limit(1);
          if (a[0]) {
            thumbnailUrl = await this.storage.presignGet(a[0].bucket, a[0].objectKey, 3600);
          }
        }
      } else {
        const candidate = await this.db
          .select({ asset: assets })
          .from(generationCandidates)
          .innerJoin(assets, eq(assets.id, generationCandidates.assetId))
          .where(eq(generationCandidates.jobId, job.id))
          .orderBy(desc(generationCandidates.createdAt))
          .limit(1);
        if (candidate[0]) {
          thumbnailUrl = await this.storage.presignGet(
            candidate[0].asset.bucket,
            candidate[0].asset.objectKey,
            3600,
          );
        }
      }
      projects.push({
        ...this.toCustomerJob(job),
        thumbnailUrl,
        delivery: job.state === "ready" ? "final" : thumbnailUrl ? "stored_candidate" : "none",
      });
    }
    return { projects };
  }

  async submitFeedback(userId: string, jobId: string, body: unknown) {
    const input = parseWith(feedbackSchema, body);
    const job = await this.getOwnedJob(userId, jobId);
    const reasons = Array.from(new Set(input.reasons));
    await this.db
      .insert(feedback)
      .values({
        jobId: job.id,
        userId,
        rating: input.rating,
        reasons,
        comment: input.comment ?? null,
      })
      .onConflictDoUpdate({
        target: feedback.jobId,
        set: { rating: input.rating, reasons, comment: input.comment ?? null },
      });
    return { ok: true, reasons };
  }

  /**
   * Regenerate one angle (or the whole set) from an existing result. Rebuilds
   * the original request from the stored inputs and runs it through the normal
   * creation path, so budget checks, validation and the queue are unchanged —
   * a regeneration is just a child job that knows where it came from.
   */
  /**
   * Batch mode (Phase 15): one garment, several looks. Each variant becomes its
   * own job through the normal creation path, so budget, validation and the
   * queue behave exactly as they do for a single generation — a batch is a
   * convenience wrapper, not a second pipeline.
   */
  async createBatch(userId: string, body: unknown) {
    const input = parseWith(batchSchema, body);
    const created = [];
    const failures: Array<{ index: number; label: string | null; message: string }> = [];
    for (const [index, variant] of input.variants.entries()) {
      const request = {
        mainGarmentAssetId: input.garmentAssetId,
        detailReferences: input.base.detailReferences ?? [],
        characterId: variant.characterId ?? input.base.characterId ?? null,
        characterAssetId: input.base.characterAssetId ?? null,
        environmentPresetId: variant.environmentPresetId ?? input.base.environmentPresetId ?? null,
        imageModelId: input.base.imageModelId ?? null,
        resolution: input.base.resolution ?? "2k",
        aspectRatio: input.base.aspectRatio ?? "portrait",
        outputCount: variant.outputCount ?? (variant.cameraAngles?.length || 1),
        cameraAngles: variant.cameraAngles ?? null,
        inputType: "photo",
        ageAppearance: input.base.ageAppearance ?? "mid-20s",
        heightAppearance: input.base.heightAppearance ?? "average",
        pose: variant.pose ?? input.base.pose ?? "auto",
        framing: variant.framing ?? input.base.framing ?? "auto",
        wearStyleId: variant.wearStyleId ?? input.base.wearStyleId ?? null,
      };
      try {
        const result = await this.createJob(userId, request, crypto.randomUUID());
        created.push({ label: variant.label ?? null, job: result.job });
      } catch (error) {
        // Partial acceptance is reported honestly: some jobs started, some did not.
        failures.push({
          index,
          label: variant.label ?? null,
          message: error instanceof Error ? error.message : "Could not start this variant",
        });
      }
    }
    if (created.length === 0) {
      throw new BadRequestException(failures[0]?.message ?? "Could not start any variant");
    }
    return { jobs: created, failures, started: created.length, requested: input.variants.length };
  }

  async regenerate(userId: string, jobId: string, body: unknown) {
    const input = parseWith(regenerateSchema, body);
    const parent = await this.getOwnedJob(userId, jobId);
    if (["ready", "manual_review", "failed", "input_rejected", "budget_stopped"].includes(parent.state) === false) {
      throw new BadRequestException("This generation is still running");
    }
    const inputs = await this.db.select().from(jobInputsTable).where(eq(jobInputsTable.jobId, parent.id));
    const main = inputs.find((row) => row.role === "main_garment");
    if (!main) throw new BadRequestException("This generation has no garment reference to rebuild from");

    const angles = parent.cameraAngles ?? [];
    const requested = input.cameraAngle ? [input.cameraAngle] : angles;
    if (input.cameraAngle && !angles.includes(input.cameraAngle)) {
      throw new BadRequestException("That angle was not part of this generation");
    }

    const sel = (parent.selections ?? {}) as Record<string, unknown>;
    const text = (value: unknown, fallback: string) => (typeof value === "string" && value ? value : fallback);
    const wearStyle = sel.wearStyle as { id?: string } | undefined;

    const childBody = {
      mainGarmentAssetId: main.assetId,
      detailReferences: inputs
        .filter((row) => row.role === "detail")
        .map((row) => ({ assetId: row.assetId, kind: row.detailKind ?? "other" })),
      characterId: parent.characterId,
      characterAssetId: parent.characterAssetId,
      environmentPresetId: parent.environmentPresetId,
      imageModelId: parent.imageModelId,
      resolution: parent.requestedResolution,
      aspectRatio: parent.aspectRatio,
      outputCount: Math.max(1, Math.min(requested.length || 1, MAX_ANGLES)),
      cameraAngles: requested.length > 0 ? requested : null,
      inputType: text(sel.inputType, "photo"),
      genderPresentation: typeof sel.genderPresentation === "string" ? sel.genderPresentation : null,
      ageAppearance: text(sel.ageAppearance, "mid-20s"),
      heightAppearance: text(sel.heightAppearance, "average"),
      pose: text(sel.pose, "auto"),
      framing: text(sel.framing, "auto"),
      wearStyleId: wearStyle?.id ?? null,
    };

    const created = await this.createJob(userId, childBody, crypto.randomUUID());
    const childId = created.job.id;
    await this.db.update(jobs).set({ parentJobId: parent.id }).where(eq(jobs.id, childId));
    return { ...created, job: { ...created.job, parentJobId: parent.id }, regeneratedAngle: input.cameraAngle ?? null };
  }

  private async getOwnedJob(userId: string, jobId: string) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException("Job not found");
    return rows[0];
  }

  private toCustomerJob(job: typeof jobs.$inferSelect) {
    return {
      id: job.id,
      state: job.state,
      display: CUSTOMER_FACING_STATES[job.state]?.label ?? job.state,
      resolution: job.requestedResolution,
      aspectRatio: job.aspectRatio,
      outputCount: job.outputCount,
      environmentPresetId: job.environmentPresetId,
      characterId: job.characterId,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

@Controller("/jobs")
@UseGuards(AuthGuard)
class JobsController {
  constructor(private service: JobsService) {}

  @Post()
  @UseGuards(GenerationRateLimitGuard)
  async create(@Req() req: AuthedRequest, @Body() body: unknown) {
    const idempotencyKey = req.headers["idempotency-key"];
    return this.service.createJob(
      req.user!.id,
      body,
      typeof idempotencyKey === "string" ? idempotencyKey : undefined,
    );
  }

  @Get("/:id")
  async status(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.getStatus(req.user!.id, id);
  }

  @Get("/:id/result")
  async result(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.service.getResult(req.user!.id, id);
  }

  @Post("/batch")
  @UseGuards(GenerationRateLimitGuard)
  async batch(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.createBatch(req.user!.id, body);
  }

  @Post("/:id/regenerate")
  @UseGuards(GenerationRateLimitGuard)
  async regenerate(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.regenerate(req.user!.id, id, body);
  }

  @Post("/:id/feedback")
  async feedback(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.submitFeedback(req.user!.id, id, body);
  }
}

@Controller("/projects")
@UseGuards(AuthGuard)
class ProjectsController {
  constructor(private service: JobsService) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    return this.service.listProjects(req.user!.id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [JobsController, ProjectsController],
  providers: [JobsService, GenerationRateLimitGuard],
})
export class JobsModule {}
