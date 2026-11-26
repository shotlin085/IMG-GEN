# 04 — Production Fashion Studio: Repository Audit & Requirement-to-Code Map

Internal working document produced for **Phase 1** of the IMG-GEN "Production Fashion AI Studio" master plan.
Audit date: 2026-09-24. Every claim below cites a file, a route, or an observation from a live run; anything not evidenced is listed as a gap in §4.

Route inventory = the 95 routes the API actually mapped at boot (`next start` + `node apps/api/dist/main.js`, mock providers).
Table inventory = 38 public tables, all with row-level security enabled by `packages/database/src/migrate.ts`.

---

## 1. Repository map

| Unit | Responsibility | Key files |
| --- | --- | --- |
| `apps/web` | Next.js 15 customer studio + admin control room (port 3100) | `src/app/*`, `src/components/*` |
| `apps/api` | NestJS 11 + Fastify, REST under `/api` (port 4000) | `src/{auth,account,customer,garments,models,presets,jobs,uploads,admin,health}` |
| `apps/worker` | BullMQ consumer executing the workflow node graph | `src/nodes.ts`, `src/processor.ts`, `src/context.ts` |
| `packages/database` | Drizzle schema, 17 migrations, seeders | `src/schema.ts`, `src/{seed,taxonomy-seed,wear-seed}.ts`, `drizzle/` |
| `packages/core` | Domain logic: schemas, prompt compiler, job state machine, camera angles, cost engine, skill selector, appearance/child-safety policy, output vocabulary, feedback taxonomy | `src/*.ts` |
| `packages/providers` | OpenRouter + deterministic mock adapters (vision, QA, adjudication, image generation) | `src/{openrouter,mock,resolver,types}.ts` |
| `packages/platform` | S3-compatible storage, image probing/normalisation, password hashing, logging | `src/*` |

Monorepo: pnpm workspaces + Turborepo (`turbo run dev|build|check|test`). Verification commands used in this audit: `pnpm -F <pkg> check`, `pnpm -r --workspace-concurrency=1 test`, `pnpm db:migrate`, `pnpm db:seed`, `node scripts/verify-p16.mjs`, `node scripts/verify-e2e.mjs`.

## 2. Audit areas required by Phase 1

1. **User routes** — `/`, `/generate`, `/projects`, `/jobs/[id]`, `/account`, `/garments`, `/models`, `/presets`, `/batch`, `/login`, `/settings` (admin-only content). `/settings` is provider config; customers are routed to `/account` instead.
2. **Admin routes** — `/admin` with 13 tabs: Overview, Workflow Studio, Models, Prompts, Skills, Quality rules, Budget & cost, Garment taxonomy, Drapes & wear, Users, Audit trail, Result feedback, Run inspector (`apps/web/src/app/admin/page.tsx`).
3. **Auth behaviour** — cookie session `shotlin_session`, SHA-256 token hash, TTL from config, `httpOnly`, `sameSite=lax`, `secure` only in production (`apps/api/src/auth/auth.module.ts`). `/api/auth/{register,login,logout,me}`. Live-verified: logout invalidates the issued cookie (subsequent `/me` → 401).
4. **Role checks** — `AuthGuard` (session) and `AdminGuard` (role) in `apps/api/src/common.ts`. Live-verified: customer → `/api/admin/users` 403; UI shows "Operator access required" while the server independently refuses. Registration hard-codes `role: "customer"`; the only admin-creation path is `POST /api/admin/users` behind `AdminGuard`, and it is audited.
5. **Asset upload flow** — `POST /api/uploads` presign → direct `PUT` to object storage → `POST /api/uploads/:id/complete` (HEAD size check before download, sha256 checksum, sharp metadata, declared-vs-detected MIME match, ≥128 px, ≤25 MB) in `apps/api/src/uploads/uploads.module.ts`. Originals immutable; upscaling creates a **separate** asset linked by `assets.enhancedAssetId`. Live-verified end-to-end (480×640 PNG → `usable`).
6. **Job creation schema** — `createJobSchema` in `apps/api/src/jobs/jobs.module.ts`: garment + ≤5 detail references, character **or** character asset, environment preset, image model, `resolution`, `aspectRatio` (6 canonical values), `outputCount ≤ MAX_ANGLES`, optional `cameraAngles`, `ageAppearance`/`pose`/`framing` validated against `packages/core` vocabularies, `wearStyleId`, `guardian`-gated under-18 rules. Requires an `Idempotency-Key` (16–128 URL-safe chars) with fingerprint conflict detection.
7. **`selections` storage** — `jobs.selections` jsonb snapshot: `inputType`, `genderPresentation`, `ageAppearance`, `heightAppearance`, `pose`, `framing`, `under18Policy`, and `wearStyle` **including its prompt fragment copy**, so later catalogue edits cannot rewrite what an old job asked for.
8. **Garment truth-sheet schema** — `packages/core/src/schemas/garment-truth-sheet.ts`: 16 fields (garmentType, inputType, colors[], material, pattern, border, embroidery, neckline, sleeves, lengthSilhouette, drapePallu, specialDetails[], protectedDetails[], uncertainDetails[], complexity, confidence 0–100). Persisted per job (`jobs.truthSheet` + model/prompt version ids) and per customer in `garment_profiles` (fingerprint-cached, `detection`/`confidence`/`confirmedAttributes`, `taxonomyVersion`).
9. **Character model** — `characters` (attributes jsonb: gender, ageAppearance, height, build, skinTone, hair), `originKind` preset|synthetic|custom, `consentConfirmedAt`, `consentStatementVersion`, `guardianConfirmedAt`, `ownerId`, `isPreset`, `isEnabled`, plus `character_identity_references` (one image per angle role).
10. **Environment model** — `environment_presets` (key, name, category, promptFragment, isEnabled, sortOrder); 17 seeded, served through `/api/customer/environments`.
11. **Camera-angle model** — `packages/core/src/camera-angles.ts`: 5 angles, `MAX_ANGLES`, `defaultAngleSet`, `resolveAngleSet` shared by UI and worker so previews cannot drift from what is generated; `jobs.cameraAngles` records the resolved set.
12. **Provider capability model** — `model_registry` (+ `model_price_versions`) with `capabilities` jsonb, parsed/checked by `packages/core/src/model-capabilities.ts`; roles vision_analyzer / prompt_compiler / image_generator / quality_reviewer / second_reviewer; `MOCK_PROVIDERS=true` forces mocks for every role (`packages/providers/src/resolver.ts`).
13. **Job lifecycle** — states `created → validating → analyzing → compiling → generating → reviewing → retrying → finalizing → ready` (+ `input_rejected`, `failed`, `budget_stopped`, `manual_review`, `cancelled`), transitions in `packages/core/src/job-state-machine.ts`, audited in `job_state_events` / `job_attempts` / `job_step_runs`. Live run recorded all ten nodes in order, with `second_review` and `retry` correctly skipped.
14. **Result lifecycle** — `generation_candidates` (sequence, cameraAngle, isAnchor, decision, decisionReasons) → `job_outputs` (master/preview/jpg variants) → `GET /api/jobs/:id/result` returning `delivery: final|stored_candidate|none`, per-image signed previews and PNG/JPG downloads, plus `requestedCount`/`deliveredCount` so withheld frames are countable. Anchor QA gating (`gateOnAnchorReview`) runs **before** fan-out spend; `retryFailedAngle` re-runs a single angle using the anchor as identity reference.
15. **Project archive** — `GET /api/projects` lists the caller's jobs with signed thumbnails and a derived delivery state; `/projects` renders them, `/` shows the three most recent.
16. **Responsive CSS** — single stylesheet (`apps/web/src/app/globals.css`), semantic tokens in `:root`, breakpoints at 1240/1060/900/760 px; measured in a real browser at 360, 390, 768, 1024, 1440, 1920: **no horizontal overflow at any width**, rail ⇄ bottom-nav swap at 760 px, step strip becomes horizontally scrollable on phones.
17. **Accessibility behaviour** — `:focus-visible` rings globally, `role=tablist`/`aria-selected` steps, `aria-pressed` on mode/chip toggles, `role=status`/`role=alert` for async messages, reduced-motion honoured (`useReducedMotion` + a global `prefers-reduced-motion: reduce` rule), safe-area padding for the bottom nav. Touch targets measured: **0 of 70 interactive elements under 44 px at 360/768**; on fine-pointer desktop the floor is 24 px (WCAG 2.2 AA 2.5.8). Note: an earlier session claimed a target-size pass that had never been measured — it was failing (smallest 29 px) and was fixed in `globals.css`.
18. **Production configuration** — root `.env` (DB, Redis, S3, cost defaults, session TTL); `packages/platform/src/config` validates per environment and refuses a missing `SEED_ADMIN_PASSWORD` in production; deployment files for Railway (API/worker) and Vercel (web). CORS is pinned to known web origins with credentials. Provider keys are read only from the server environment; `/api/admin/settings` reports *configured/not configured* and never echoes secrets, and the connectivity test runs server-side.

## 3. Requirement-to-code map (16 phases)

Status vocabulary: **built+live-verified** (exercised against a running stack), **built+type/test** (compiles, unit-tested, not yet exercised in a browser/device), **partial**, **not built**.

| Phase | Requirement | Where | Status |
| --- | --- | --- | --- |
| 1 | Audit + requirement map | this document | built |
| 2 | Two products sharing one backend; customer nav; admin nav hidden from customers; server-side role checks | `app-shell.tsx`, `admin/page.tsx`, `AdminGuard` | built+live-verified |
| 3 | Design system, semantic tokens, ~32 named components, AA | `globals.css`, `components/*` | partial — tokens/conventions exist; the named-component catalogue and remaining AA sweeps (contrast audit, focus order on modals) are open |
| 4 | Mobile-first 320→1600+, bottom sheets, sticky summary | `app-shell.tsx`, `camera-capture.tsx`, `globals.css` | built+live-verified for layout/overflow/targets; **not verified visually** (no browser surface) |
| 5 | Auth, account settings, org info, skippable first-run onboarding | `account/*`, `/account`, `OnboardingTour` | built+live-verified (onboarding write, prefs, password change, session revocation) |
| 6 | Camera capture, gallery pick, HEIC, orientation, metadata stripping, upload progress/analyse/retry | `camera-capture.tsx`, `uploads.module.ts` | partial — capture + validation verified; HEIC conversion and on-device camera flow untested, no per-file progress bar |
| 7 | AI garment understanding, editable "we detected", fingerprint cache | `garment_profiles`, `/api/garments/analyze`, `garment-intel.tsx` | built+live-verified for API/cache; UI edit path type-tested only; field count is the existing 16-field truth sheet, **not** the plan's ~26 |
| 8 | Extensible hierarchical taxonomy, aliases, compatibility, admin-managed, no footwear | `garment_taxonomy`, `taxonomy-seed.ts`, admin CRUD | built+live-verified (164 nodes; admin create/rename/delete + 409 on duplicate slug); UI surfaces top two levels only |
| 9 | Model browser, filters, 9 age groups, custom model with consent | `model-library.module.ts`, `/models`, `model-appearance.ts` | built+live-verified for consent gates and vocabulary; **synthetic identity generation is not implemented** (the `synthetic` origin kind is settable but nothing creates it) |
| 10 | Server-side under-18 policy, blocked styling/pose, guardian confirmation | `evaluateChildSafety`, `jobs.module.ts`, `nodes.ts` | built+live-verified — blocked pose rejected at creation (400 with substitution), guardian required for custom minors, and the compiled brief carries `CHILD-SAFE DIRECTION` |
| 11 | Drape/wear library, admin-addable, contextual controls | `wear_styles`, `wear-seed.ts`, wear picker | built+live-verified (14 saree drapes, 12 dupatta placements; picker offered 14 for a detected saree; prompt fragment reaches the compiled brief) |
| 12 | Guided 5-step flow, Quick/Pro, draft persistence | `generator.tsx` | built+type-verified; browser-rendered (steps, toggles, preset bar) but interactions untested |
| 13 | Scenes, poses, framings, ratios, quality modes | `output-vocabulary.ts`, seed, `/customer/options`, `openrouter.ts` | built+live-verified for 17 scenes, 13 poses, 7 crops, 6 real ratios; **Draft→Maximum quality modes not built** |
| 14 | Human-readable progress, gallery, per-image regeneration, withheld explanation, 7 feedback options | `jobs/[id]/page.tsx`, `/regenerate`, `feedback.ts` | built+live-verified for progress/withheld counts/regenerate/7 reasons; **swipe gestures and reuse-as-reference not built** |
| 15 | Projects, garment library, model library, presets, brand look-books, batch | `/garments`, `/models`, `/presets`, `/batch`, `studio_presets`, `/api/jobs/batch` | built+live-verified for routes/rendering; batch verified at the API (2/2 started) |
| 16 | Admin control plane + production hardening | `admin/*`, `unique-violation.ts`, suspension | partial — 13 tabs live; **moderation queue, benchmark run UI, and price-version editing UI are still missing**; route/DI/unique-violation hardening done by live boot |

Cross-cutting: migrations are the only way entities were added (0011–0017, all applied to a real database); no AI execution in the Next request path; worker untouched as the only executor; provider behaviour never hard-coded in UI components (vocabularies served by `/api/customer/options`); historical reproducibility preserved (`selections` + `wearStyle` fragment copy + execution manifests).

## 4. Honest gaps, risks and reproduction notes

1. **Never visually confirmed.** The in-app browser reports a 0×0 hidden surface, so no screenshot exists for any screen. Measurements came from DOM/`getBoundingClientRect` inside sized iframes, which proves layout geometry and media queries but not paint, fonts, or image quality.
2. **Live providers unexercised.** All runs used `MOCK_PROVIDERS=true`. The QA/adjudication/prompt-compiler path against OpenRouter has not been run in this session (credits deliberately unspent).
3. **Local port collisions.** Another project holds host ports 5434 and 9000, so this repo's `docker compose up` cannot bind its own Postgres/MinIO. Audit work used throwaway containers on 5499/9010 mounted on the project volumes, then removed them. Fix the compose host ports or free them before running the normal stack.
4. **Orphan servers.** `pnpm -F shotlin-web start` leaves a `next` child holding 3100 after the parent task is stopped, silently serving a stale build. Compare the served stylesheet hash against `apps/web/.next/static/css/` when in doubt.
5. **Tables without UI:** `benchmark_cases`, `benchmark_runs`, `retry_plans` (worker-written, admin-readable only via the job inspector), `budget_rules` beyond the single slider panel. No moderation/abuse queue table exists yet.
6. **Truth-sheet breadth:** the plan's ~26 detection fields vs the current 16. Extending it changes the compiled prompt, so it needs its own prompt-version bump rather than an in-place edit.
7. **Rate limiter UX:** a rejected creation still consumes the short generation lock, so correcting a validation error and retrying immediately yields 429.
