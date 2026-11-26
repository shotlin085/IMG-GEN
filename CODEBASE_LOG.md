# Shotlin MVP - Persistent Codebase Log

This file is the permanent development memory for the Shotlin MVP.

Every coding agent must read this file before making changes and update it after meaningful changes.

Do not store passwords, API keys, access tokens or secrets here.

---

## 1. Project Goal

Build the Shotlin Zero-Prompt Garment Image Generation MVP.

Customer flow: Upload Garment → Choose Character → Age/Height/Pose → Environment → Resolution → Aspect Ratio/Image Count → Generate → Quality Review → Retry if Required → Preview → Download.

Source requirement docs live in `docs/` (copies of the three original architecture documents).

---

## 2. Current System Status

**Overall Status:** Operator-grade local workflow studio complete; mock-first verification green

**Currently Working On:** Stage 8 — verification polish and live-provider readiness.

**Provider configuration update (2026-08-19):** Production AI routing is now OpenRouter-only. Vision, QA, and adjudication use `qwen/qwen3.8-27b` through OpenRouter structured outputs; image generation uses `bytedance-seed/seedream-4.5` through OpenRouter's dedicated `/api/v1/images` endpoint with private base64 reference images. `GEMINI_API_KEY` is no longer required or read by the runtime. The database enum retains `gemini` only for historical rows.

**Last Successfully Completed:**

* Stages 0–7 implemented: schema/migrations/seed, domain logic, providers/platform, Nest API, BullMQ worker, customer UI, and admin control room.
* Local Compose stack booted; migrations and seed completed; API and web smoke-tested.
* Frontend is connected to API health, auth, catalog, presigned upload/complete, and job creation paths.
* Fixed local CSS blank/default rendering: concurrent `next build` had clobbered the dev `.next` cache and caused a stale stylesheet 404; stopped dev, cleared generated cache, and restarted cleanly.
* Replaced the static admin shell with a live Workflow Studio: production-version node graph, model/prompt bindings, editable thresholds/settings, versioned prompt draft editing, quality gate, budget controls, live job polling, candidate/review/defect/trace/cost inspector, and API-backed registries.
* Added `/settings` with an admin-protected, server-side OpenRouter `/models` connectivity test. Provider secrets are not persisted or echoed; the worker remains explicitly environment-configured.
* Customer projects and job result pages now read `/api/projects`, poll `/api/jobs/:id`, load signed outputs, and submit feedback instead of rendering demo records.

---

## 3. Current Architecture

Monorepo: pnpm workspaces + turbo. Path: `/Users/sayan/Documents/IMG GEN`.

### Customer Website

* Status: Implemented customer workspace with zero-prompt generator, local reference preview, age/height/pose, character/environment/output selectors, real queue submission, API-backed project archive, polling job result view, signed downloads, feedback, and login screen.
* Important files: `apps/web/src/components/`, `apps/web/src/app/`

### Admin Dashboard

* Status: Implemented live control room with production workflow graph and node inspector, versioned prompt/model/skill registry views, quality rules, budget controls, live run inspector, operational metrics, and explicit admin access gate.
* Important files: `apps/web/src/app/admin/page.tsx`, `apps/web/src/components/workflow-studio.tsx`

### Backend API

* Status: Implemented REST API with auth/session, uploads, customer listings/jobs/projects, admin config/data endpoints, health checks, and server-side OpenRouter connectivity testing.
* Important files: `apps/api/` (NestJS 11 + Fastify, port 4000)

### Workflow Worker

* Status: Implemented fixed workflow engine with input gate, vision, skill selection, prompt compilation, image generation, QA, rules, retry/budget paths, and finalization.
* Important files: `apps/worker/` (BullMQ worker running the generation pipeline)

### Database

* Status: Schema, migration, and seed implemented; Postgres 16 + pgvector runs via docker-compose
* Important files/migrations: `packages/database/` (Drizzle ORM + drizzle-kit)

### AI Workflow

* Status: Implemented deterministic core, mock/OpenRouter/Gemini adapters, storage, queue, and worker orchestration.
* Important files: `packages/core/` (rule engine, cost engine, schemas, selector, compiler), `packages/providers/` (OpenRouter / Gemini / Mock adapters), `packages/platform/` (storage, queue, config)

### Infrastructure

* docker-compose: postgres (pgvector/pgvector:pg16, port 5432), redis (6379), minio (9000/9001, buckets `uploads` + `outputs`)
* Local credentials are in `.env` (not committed); template in `.env.example`

---

## 4. Current AI Workflow

```text
Input → Validation → Vision Analysis → Garment Truth Sheet → Skill Selection
→ Prompt Compiler → Image Generation → Quality Review → Rule Engine
→ PASS / FAIL / UNCERTAIN → Second Review (uncertain) → Retry if FAIL within budget
→ Final Output
```

### Vision Model

Provider: OpenRouter (configurable) / Model: Qwen3.6-35B-A3B (config, not code) / Prompt: Garment Analysis v1

### Prompt Compiler

Provider: deterministic template first / Model: — / Prompt: Compiler v1

### Image Generator

Provider: Google Gemini adapter / Model: Gemini 3.1 Flash Image / Prompt: Image Generation System v1

### Quality Reviewer

Provider: OpenRouter / Model: MiMo-V2.5 / Prompt: Quality Review v1

### Fallback Model

Provider: OpenRouter / Model: GLM-4.6V (second reviewer, uncertain cases only)

**All model IDs / prompts / skills / thresholds / retry / budget limits are database configuration (admin-editable), never hard-coded.**

**Mock mode:** `MOCK_PROVIDERS=true` in `.env` forces deterministic mock adapters so the whole pipeline is testable without API keys. Live keys absent as of 2026-08-19.

---

## 5. Current Skills

Seeded as Production v1 (planned, Stage 1): Garment Analysis, Saree Fidelity, Kurta Fidelity, Dress Fidelity, Generic Garment Fidelity, Character Preservation, Fine Textile Detail, Outdoor Photography, Indoor Photography, Studio Photography, Photorealism, Garment Repair, Anatomy/Character Repair.

---

## 6. Database Changes

### Entry Template

**Date:** 2026-08-19
**Change:** Initial schema being authored (Stage 1)
**Tables/Fields affected:** ~30 tables (users, sessions, assets, characters, environments, workflows/versions/nodes/configs, model_registry, model_price_versions, prompts/versions, skills/versions/rules, jobs family, cost_events, budget_rules, feedback, benchmark tables, admin audit)
**Migration/File:** `packages/database/src/schema.ts`, `packages/database/drizzle/`
**Reason:** Docs 02 §3 schema plan
**Verified:** No (pending)

---

## 7. API / Provider Changes

**Date:** 2026-08-19 — **Provider:** OpenRouter + Google Gemini + Mock — **Change:** initial adapter design (Stage 3) — **Reason:** docs logical-role architecture. No keys present yet; mock mode is the default.

---

## 8. Prompt Changes

Seeded v1 prompt set planned (Stage 1): input quality, garment vision, prompt compiler, image generation system, quality review, repair, second review.

---

## 9. Cost Configuration

### Current Planning Budget

2K successful image: **₹20 maximum internal planning estimate** (warn ₹15)

### Current Actual Measurements

Vision cost: — / Image-generation cost: — / QA cost: — / Average retry cost: — / Average successful-image cost: — / Number of measured jobs: 0

(Filled from real data after live runs; mock runs record cost events with configured prices.)

Planning reference prices seeded into `model_price_versions`: Gemini 3.1 Flash Image 2K USD 0.101/img (1K/4K seeded per admin data), Qwen3.6-35B-A3B USD 0.14/M in + 1.00/M out, MiMo-V2.5 USD 0.105/M in + 0.28/M out, GLM-4.6V USD 0.30/M in + 0.90/M out. FX default 95.78.

---

## 10. Completed Features

* [x] Customer garment upload UI + presigned upload API
* [x] Character selection and character upload API
* [x] Age, height/presence, and pose selection
* [x] Environment, resolution, aspect-ratio, and image-count selection
* [x] Vision analysis and Garment Truth Sheet schema
* [x] Skill selection and deterministic prompt compilation
* [x] Mock/OpenRouter/Gemini provider adapters
* [x] Automatic QA, PASS/FAIL/UNCERTAIN rules, second review, retries, and budget stop
* [x] Preview/master/JPG finalization path
* [x] Workflow, model, prompt, skill, quality, budget, cost, job, character, and environment admin APIs
* [x] Customer UI, job result view, projects archive, and admin control room
* [ ] Full worker E2E acceptance suite and 15-test acceptance checklist
* [ ] Live-provider runs after credentials are supplied

---

## 11. Known Problems

* No AI provider keys yet → live generation untested; mock mode is the verification path.

---

## 12. Important Decisions

**Date:** 2026-08-19
**Decision:** Monorepo layout: `apps/web` (Next.js UI only), `apps/api` (NestJS+Fastify REST), `apps/worker` (BullMQ workflow engine), `packages/{database,core,providers,platform}`.
**Why:** User chose separate NestJS API service; docs require generation outside web request lifecycle.
**Alternatives considered:** single Next.js app with API routes (rejected by user).
**Impact:** all AI calls live in worker; API only validates/persists/enqueues.

**Date:** 2026-08-19
**Decision:** Local infra via docker-compose (Postgres 16 + pgvector, Redis 7, MinIO). Object storage behind S3-compatible abstraction.
**Why:** Self-managed per docs; one command to boot.
**Impact:** migrations must create fresh DB from zero.

**Date:** 2026-08-19
**Decision:** Mock-provider-first. `MOCK_PROVIDERS=true` default in `.env`; OpenRouter/Gemini adapters implemented but dormant until keys provided.
**Why:** Keys not yet available; pipeline must be verifiable end-to-end deterministically.
**Impact:** acceptance tests run in mock mode now; live runs later by flipping env.

**Date:** 2026-08-19
**Decision:** Internal packages compile to CJS `dist/` via tsc; `exports` includes a `development` condition pointing at `src/` used by Vitest. NestJS API built with tsc (emitDecoratorMetadata), dev via concurrently (tsc watch + node --watch).
**Why:** tsx/esbuild cannot emit decorator metadata required by NestJS DI; boring-reliable build graph.
**Impact:** run `pnpm build` before `pnpm dev`/`check`/`test` (turbo handles ordering).

**Date:** 2026-08-19
**Decision:** Auth = email/password (scrypt from node:crypto) with opaque session tokens hashed in `user_sessions`, httpOnly cookie. Roles: customer/admin.
**Why:** MVP-simple, revocable, no external auth dependency.

---

## 13. Files Changed Recently

```text
package.json / pnpm-workspace.yaml / turbo.json / tsconfig.base.json
- Monorepo scaffold and task pipeline
docker-compose.yml
- Postgres+pgvector, Redis, MinIO + bucket init
.env / .env.example
- Local config template (secrets never committed)
apps/{api,worker,web} + packages/{database,core,providers,platform}
- Project skeletons with build/dev/check scripts
CODEBASE_LOG.md
- This log, initialized
docs/
- Copies of the three Shotlin architecture requirement documents
```

---

## 14. Tests and Verification

* `pnpm build` passes for all 7 workspace packages/apps.
* `pnpm check` passes for all workspace packages/apps.
* `pnpm test` passes: 34 core unit tests; API/worker runners pass with `--passWithNoTests` until their E2E suites are added.
* `docker compose config --quiet` passes.
* Docker services healthy: Postgres, Redis, MinIO.
* `pnpm db:migrate` and `pnpm -F @shotlin/database db:seed` pass.
* `pnpm dev` boots API, web, and worker after fixing Nest module guard imports.
* Smoke checks pass: `GET /api/health` returns `status: ok`; web `/` returns 200 and rendered Shotlin copy.
* Current local session: `pnpm dev` running API on 4000, web on 3100, worker on BullMQ/Redis.
* CSS smoke check passes: generated layout stylesheet returns HTTP 200 and contains `.app-frame`, `.rail`, `.display`, and theme variables.

---

## 15. Next Actions

1. Add the full worker/API mock E2E suite for happy path, repair retry, UNCERTAIN second review, budget stop, and input rejection.
2. Walk and record the 15 acceptance tests from the source docs in mock mode.
3. Supply provider keys and re-run live adapter acceptance tests.
4. Add benchmark cases/runs before publishing accuracy claims.

---

## 16b. Session Handoff Addendum — 2026-08-22, continued (Phase 1/3 fixes)

Docker recovered; migration `0003_ambiguous_nico_minoru.sql` applied
successfully; `pnpm build` (all 7 packages) and `pnpm test` (59/59) both
pass. Two more real, live-confirmed bugs found and fixed after the P0-1 audit
below:

**Anchor QA gate (Phase 3, cost correctness):** `image_generate` was
generating the full multi-angle set unconditionally before any review
happened — exactly what directive Section 14 says not to do. Added
`gateOnAnchorReview` in `apps/worker/src/nodes.ts`: the anchor is reviewed
immediately after it generates, and fan-out is skipped entirely if the
anchor confidently `FAIL`s (still proceeds on `UNCERTAIN` — resolving that
needs a second opinion, which is a bigger control-flow change, documented as
a follow-on). Verified live: a real job's attempt 1 had a failed anchor and
correctly persisted only 1 candidate instead of 3 — direct cost savings
confirmed. Verified via `quality_reviews` table that the anchor is never
billed twice (exactly one `primary` review per candidate, always).

**Cost ledger source of truth (P0-3, confirmed live, not theoretical):**
`jobs.total_cost_inr` was only ever persisted on the success path
(`finalize`). Every other exit — retry, budget-stop, max-attempts-failed,
manual-review — never wrote it, so the budget check for the *next* attempt
re-read a stale total that had silently lost every earlier failed attempt's
spend. Confirmed against a real 3-attempt job: cached total showed ₹13.82,
the actual `cost_events` ledger summed to ₹33.48 — the cached figure was
missing more than half the real spend, and this also meant the hard-stop
budget check was enforcing against an understated total. Fixed:
`sumCostEventsForJob` (new, `apps/worker/src/db.ts`) now feeds the budget
check at the start of every attempt, and `finalizeJobCost` is called at
every exit point of `runConfiguredWorkflow`, not just success. Ran a
one-time reconciliation against the live database: 6 jobs had drifted; all
corrected to match the ledger exactly.

**Also removed:** "Estimated internal reserve ₹..." from the customer-facing
generator UI (`apps/web/src/components/generator.tsx`) — this was leaking
internal cost figures to customers (Section 78), including a hardcoded
version that predated this session's work.

**Verification:** all fixes typecheck clean, `pnpm build` passes for all 7
packages, 59/59 unit tests pass, and both the anchor gate and the P0-1
per-candidate QA fix were confirmed together against a real live 3-angle job
(`55487924-17a4-4ca8-90d2-68d07a863bd9`) — attempt 1 correctly skipped
fan-out on anchor FAIL, attempt 3 correctly delivered 2 of 3 passing angles,
and cost accounting for the whole job is now ledger-accurate.

**What's next:** persistent structured `RetryPlan` + true per-angle retry
(currently a failed non-anchor angle is withheld, not regenerated) — see
`docs/REMAINING_MVP_EXECUTION_PLAN.md` Phase 1 for full detail.

---

## 16c. Session Handoff Addendum 2 — 2026-08-23 (RetryPlan + Execution Manifest)

**Blocker hit:** the live OpenRouter key hit its account spend/usage limit
(`403: Key limit exceeded`) mid-session. User chose to continue building
with typecheck + unit tests only, no further live AI spend, until the limit
resets or is raised. All work below is verified via typecheck + `pnpm build`
+ unit tests (59/59 pass), not live jobs, except where noted.

**Persistent `RetryPlan` + true per-angle retry** — new `retry_plans` table
(migration `0004_careful_iron_man.sql`). `runRetry` now resolves the anchor
candidate specifically (was using "last pushed candidate," same class of bug
as the original P0-1 finding) and persists a plan for whole-set retries.
New: `runFinalize` regenerates one failed non-anchor angle at most once,
reusing the approved anchor + repair instruction, before permanently
withholding it — implemented via a new `retryFailedAngle` helper in
`apps/worker/src/nodes.ts`. **Live-verified**: the whole-set retry + anchor
gate interaction was confirmed on a real job before the key limit hit. The
single-angle branch itself has not yet fired on a real job (needs an
anchor-passes-one-angle-fails outcome) — pending live verification.

**Execution manifest creation** — new `execution_manifests` table
(migration `0005_conscious_lake.sql`). `JobsService.createExecutionManifest`
(`apps/api/src/jobs/jobs.module.ts`) snapshots workflow nodes/configs,
enabled models by role, resolved production skill versions + instruction
hash, quality thresholds, budget rules, and FX rate into one immutable
record per job, written inside the same transaction as job creation. Every
field name was cross-referenced against the live schema by hand while
writing this (caught two real mismatches before they shipped: `skillRules`
has no `skillVersionId` — it resolves to a skill's current production
version the same way the worker's `loadJobData` already does; `skillVersions`
uses `instruction` singular, not `instructions`). **Not live-verified** —
deliberately not tested by creating a real job, since that would immediately
hand off to the live worker queue and spend real money.
**Scoping note:** this only covers manifest *creation*. The worker still
reads live config via `loadJobData`, not from the frozen manifest — making
the worker actually execute against the manifest is the remaining half of
this feature and needs live verification to land safely.

**Also fixed:** `apps/worker/src/db.ts`'s `loadJobData` was loading the
*entire* `assets` table into memory on every single job attempt
(`assetsById`) and never using the result anywhere — confirmed dead via
grep across the whole worker package, removed. This ran on every attempt of
every job, so it was a real, unbounded, silently-worsening performance
issue as the assets table grows (Section 110/111 territory).

**Environment note:** this machine hit `VirtualAlloc failed` (OS-level
memory allocation failure) running `drizzle-kit generate` once this session
— free RAM was down to 0.4GB at the time. Retried successfully seconds
later. This machine is persistently memory-constrained; expect intermittent
tool/process failures under load, not necessarily code bugs.

**Idempotency / worker restart audit (Section 66), done:** traced the full
crash path in `processGenerationJob`. Every normal exception was already
correctly handled (existing `try/finally` persists cost, sets a terminal
state, releases the Redis lock) — good prior engineering. The real gap was a
**hard process crash** (exactly this session's own Docker/OOM incidents):
the `finally` never runs, so the attempt row stays `status='running'`
forever, silently inflating `getPreviousAttempts`'s count and never
surfacing to an operator as failed. Fixed with
`markStaleRunningAttemptsFailed` (`apps/worker/src/db.ts`), called right
after lock acquisition — a successfully-acquired lock proves the row is
orphaned, not a live race. **Genuinely live-verified, zero cost**: inserted
a synthetic 20-minute-old `running` attempt via direct SQL, ran the real
function against the live database, confirmed it was correctly marked
failed; inserted a fresh `running` attempt, confirmed it was correctly left
alone. Both test rows cleaned up. Not attempted: provider-request-ID
dedup (needs provider-adapter changes) and BullMQ `attempts`/backoff tuning
(needs live-tested tuning to avoid retry storms — not safe to guess blind).

**Priority-aware prompt budgeting (Phase 2, Section 21), done:** found a real
bug in `packages/core/src/prompt-compiler.ts` while implementing this —
the old code assembled `system+facts+skills+repair` as one string and
end-sliced at `maxChars` on overflow. Since the repair instruction (the
retry's actual correction) was appended last, it was the *first* thing
silently dropped on any overflow — exactly backwards from what a retry loop
needs. Rewritten to reserve budget for facts+repair first and spend only
the leftover on skills (omitted whole, never partial, when tight); only
flags `mandatoryLayerPreserved: false` in the rare case facts+repair alone
exceed the budget. 9 unit tests (up from 5), all passing, including one that
reproduces the exact old-bug scenario and proves the repair instruction now
survives. Pure internal rewrite — external contract (`CompiledPrompt.prompt`
etc.) unchanged, so this needed no live AI verification, just typecheck +
tests, both clean.

**Hard-fail defect codes wired up (Phase 2, Section 29), done:** audit found
`hardFailDefectCodes` was dead — type existed, all 3 call sites hardcoded
`[]`, and the rule engine had a redundant unreachable branch (any critical
defect already auto-failed unconditionally, making the original blocklist
logic pointless as written). Rewrote `evaluateRules` so the list's real
value is catching **minor**-classified defects whose code is configured as
always-unacceptable — a genuine admin override on top of the reviewer's own
severity judgment, not a duplicate of what critical defects already do.
Added `budget_rules.hard_fail_defect_codes` (migration
`0006_aromatic_gamma_corps.sql`), wired all 3 worker read sites, seeded both
the live DB and `seed.ts` with the directive's own Section 29 code list,
exposed it via `GET/PUT /admin/quality-rules`. Verified two ways: 4 new unit
tests, and a live zero-cost check — logged into the running API, confirmed
`GET /admin/quality-rules` returns the seeded codes correctly. 67/67 core
tests pass.

**What's next:** resume with a live end-to-end test once the OpenRouter key
limit is resolved — specifically try to observe the single-angle retry
branch firing, and do a live create-job check that `execution_manifests`
actually populates correctly. After that: semantic Protected Detail
cross-check against the Garment Truth Sheet (Section 18's fuller vision,
vision-analysis-dependent), character/garment identity packs, worker reads
from the manifest instead of live config (the harder half of Section 8),
workflow draft/publish lifecycle (Section 46). Full detail and up-to-date
checklist in `docs/REMAINING_MVP_EXECUTION_PLAN.md`.

---

## 16d. Session Handoff Addendum 3 — 2026-08-23 (Character reference-photo fix + auth rate limiting + CSRF/CORS audit + upload hardening + security headers + admin audit log gap + structured logging [Phase 7 complete] + OpenRouter contract tests)

**Bug found:** catalog/preset characters (Priya, Aarav, Ishita, Rohan, Meera,
Kabir) have always been text-only. `characters.previewAssetId` is a real
schema column, but nothing anywhere ever wrote to it, and both places
`apps/worker/src/nodes.ts` built a `characterReference` for the image
generator (`runImageGenerate`, `retryFailedAngle`) checked *only*
`ctx.job.characterAssetId` — the customer's own ad-hoc upload. A customer
who uploads their own character photo gets a real image-based identity
lock; a customer who picks "Priya" from the catalog gets nothing but the
text string `CHARACTER LOCK: Priya — Indian woman in her mid-twenties...`.
This is exactly the identity-drift failure mode Section 10/37 of the
directive describes — no image reference means no real guarantee "Priya"
looks the same face-to-face across separate jobs.

**Fix, two parts:**

1. **Worker**: added `resolveCharacterReference(ctx, deps)` in
   `apps/worker/src/nodes.ts` (placed just above `gateOnAnchorReview`) —
   priority is `ctx.job.characterAssetId` (customer upload, unchanged) then
   `ctx.character?.previewAssetId` (catalog character's reference photo,
   new) then `undefined`. Replaced the two duplicated inline construction
   blocks in `runImageGenerate` and `retryFailedAngle` with calls to this
   one helper.
2. **Admin API**: found the fix above was reachable in code but *inert* in
   practice — `AdminCharactersController`'s create/update endpoints
   (`apps/api/src/admin/admin-data.controllers.ts`) never accepted a
   `previewAssetId` field, so there was literally no way to attach a
   reference photo to a catalog character, even though the generic
   presigned-upload flow (`POST /uploads`, `kind: "character_reference"`)
   already existed and worked. Added `previewAssetId` to both schemas, with
   a new `assertUsableAsset` guard that 404s on a missing asset and 400s on
   one that hasn't cleared upload validation (`validationStatus !==
   "usable"`) — so a broken or unvalidated upload can never silently become
   a character's identity lock.

**Live-verified, zero cost:** confirmed all seeded catalog characters
currently have `previewAssetId = NULL` (the bug was real, not
hypothetical). Logged into the running admin API and round-tripped the new
endpoint: `PUT /api/admin/characters/:id` with a nonexistent asset id →
404 as expected; with a real `usable` asset id → 200, row updated. Followed
the DB row to its `assets` record to its actual MinIO object
(`mc stat`) and confirmed the 2MB file genuinely exists at that bucket/key
— the same `bucket`/`objectKey` pair `resolveCharacterReference` passes to
`storage.getObject`. Reverted the test attachment afterward (it was a
garment-reference photo, not a real portrait, attached only to prove the
plumbing). `apps/worker` and `apps/api` both typecheck clean;
`pnpm -F @shotlin/core test` still 67/67 (this change doesn't touch
`@shotlin/core`, run anyway per this session's standing discipline).

**Not done / explicitly deferred:** no admin UI exists yet to actually
*use* this endpoint — an operator has to call `/uploads` +
`/admin/characters/:id` by hand (curl/Postman) until a form is built in the
Workflow Studio. The bigger structural version of this fix — a full
`character_identity_references` table with front/¾/full-body slots per
character, referenced in Section 15-16 of the directive — is still not
started; today's fix is the minimal single-photo version. End-to-end proof
that this actually improves visual identity consistency needs a live
generation against a character with a real portrait attached, which stays
deferred along with everything else pending the OpenRouter key limit.

**Auth brute-force gap found and fixed (Phase 7, zero-cost, live-verified):**
audited `/api/auth/login` and `/api/auth/register` (`apps/api/src/auth/auth.module.ts`)
per the Phase 7 security checklist and found **no rate limiting at all** —
`AuthService.login` called `verifyPassword` against the DB with a completely
unbounded request loop, i.e. an open password-guessing endpoint. The
codebase already had one rate-limit pattern to follow
(`apps/api/src/jobs/generation-rate-limit.guard.ts`, Redis `INCR`+`PEXPIRE`,
keyed per authenticated user) — but login/register have no authenticated
user yet, so the new `AuthRateLimitGuard`
(`apps/api/src/auth/auth-rate-limit.guard.ts`) keys on `request.ip` instead:
20 attempts per 15 minutes, then `429` with `Retry-After`. Applied to both
`/auth/login` and `/auth/register`. **Live-verified, zero cost, on the
running dev API:** sent 22 consecutive bad-credential login requests —
attempts 1–20 correctly returned `401`, attempts 21–22 correctly returned
`429`; confirmed the Redis key (`shotlin:rate-limit:auth:127.0.0.1`) held
the right count and TTL; deleted the test key afterward and confirmed a
real login succeeds again immediately. `apps/api` typechecks clean.
**Scoping note, stated plainly in the guard's own docstring:** this keys on
`request.ip`, which is only trustworthy for direct connections — a
deployment behind a reverse proxy needs Fastify `trustProxy` configured
before this reflects real client IPs (a deployment-topology decision, not
guessed at here). It also doesn't rate-limit per-account, so a distributed
attacker rotating source IPs could still brute-force one specific email
within the guard's own per-IP limits — a further hardening step, not
attempted. CSRF posture, CORS allowlist strictness beyond what already
exists, upload MIME/magic-byte hardening, presigned URL expiry policy,
audit logging for admin mutations, and security headers (helmet) remain
unreviewed Phase 7 items.

**CSRF/CORS audit (Phase 7), done — mostly already safe, two small
hardenings applied:** checked every mutation path against the session
cookie's actual attributes rather than assuming a gap. Finding: the app is
already substantially protected. `setSessionCookie`
(`apps/api/src/auth/auth.module.ts`) sets `sameSite: "lax"`, which blocks
the cookie on cross-site `POST`/`PUT`/`PATCH`/`DELETE` regardless of
whether the request comes from a form submission or `fetch`/XHR — the two
classic CSRF vectors. The one case Lax *does* allow (cross-site top-level
`GET` navigation) is harmless here: grepped every `@Get()` in
`apps/api/src` and confirmed all of them are read-only listings/fetches,
never mutations, so there's no state-changing GET endpoint for that case to
exploit. The CORS origin allowlist (`apps/api/src/main.ts`) is a strict
array (not a wildcard or reflected origin), which also stops a malicious
page's JS from reading a cross-origin response even in the cases the cookie
policy alone wouldn't cover. Net: **no CSRF token layer needed given the
current cookie/CORS posture** — adding one would be complexity without a
matching gap. Two real, smaller things fixed while auditing:
1. `WEB_URL` (`packages/platform/src/config.ts`) had no format validation —
   now `z.string().url()`, so a malformed CORS origin fails fast at boot
   instead of silently producing a broken or unintended CORS policy.
2. The hardcoded dev origin `http://localhost:3100` was unconditionally
   present in the CORS allowlist, including in a hypothetical production
   boot. It's not remotely exploitable (only the visiting browser's own
   localhost can send that Origin header) but it's still an allowlist entry
   that can never be legitimately used in production, so `main.ts` now
   excludes it when `NODE_ENV === "production"`.

**Live-verified, zero cost:** confirmed the API boots and serves normally
after both changes (dev `NODE_ENV` still includes the localhost origin, so
this was a no-op change for local dev, as intended); confirmed a CORS
preflight from the dev web origin still returns
`access-control-allow-origin: http://localhost:3100` unchanged.
`@shotlin/platform` and `@shotlin/api` both typecheck clean.

**Upload hardening (Phase 7), done:** audited `UploadsService.complete`
(`apps/api/src/uploads/uploads.module.ts`) against the "decompression bomb"
concern flagged as unreviewed and found a real ordering bug, not just a
theoretical gap. The 25MB size check (`head.contentLength > 26_214_400`)
ran *after* the full object was already downloaded via `getObject` and
decoded via `extractImageMeta` (sharp) — so an oversized file, or a small
file crafted to decode into a huge bitmap, was fully downloaded and pushed
through the image decoder before ever being rejected. On a host that's
been at <1GB free RAM repeatedly this session, that ordering is a real
stability risk, not a nitpick. **Fixed:** the size check now runs directly
off the cheap `headObject` response, before any `getObject` download or
decode is attempted. Also added an explicit `limitInputPixels: 50_000_000`
to `extractImageMeta`'s sharp call (`packages/platform/src/image-utils.ts`)
— sharp already has a default pixel ceiling (~268MP) that provides some
protection, but that's still large enough to allocate a big raw bitmap on
this box; 50MP is generously above any real garment photo (a 45MP DSLR
shot is ~8200×5500) while capping worst-case decode memory much tighter.
**Live-verified, zero cost, on the running dev API:** presigned + uploaded
a 26MB block of random bytes and called `/complete` — got back
`"reason": "File exceeds 25MB limit"` (not a decode-error message),
proving the size check now fires before decode is ever attempted for a
file that would otherwise error differently. Then presigned + uploaded a
genuine tiny valid PNG and confirmed the normal decode-and-validate path
is unaffected (`width:1, height:1, ... "Image too small (min 128px)"` —
correct, existing behavior, unbroken by the reorder). All test assets and
objects cleaned up afterward. `@shotlin/platform` and `@shotlin/api`
typecheck clean; core suite still 67/67.

**Security headers (Phase 7), done:** the API had none of the standard
response security headers. Rather than pull in `@fastify/helmet` as a new
dependency (real risk on this session's slow/unreliable network, and mostly
unnecessary — this API is JSON-only behind `/api`, no server-rendered HTML,
so a full CSP policy has little to protect), added a small `onSend` hook
directly in `apps/api/src/main.ts` setting the headers that actually matter
for a credentialed-cookie JSON API: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
and `Strict-Transport-Security` (production only, since it's meaningless —
and can be actively harmful to test — over plain HTTP). **Live-verified,
zero cost:** confirmed all three non-HSTS headers appear on a real response
from the running dev API (`NODE_ENV=development`, so HSTS correctly absent);
confirmed the CORS preflight response is unaffected and still carries the
right `access-control-*` headers alongside the new ones. `@shotlin/api`
typechecks clean; core suite still 67/67.

**Admin audit log (Phase 7), done — turned out to be a wiring gap, not a
missing feature.** The execution plan tracked this as an unbuilt feature,
but auditing the actual code found `admin_audit_events`
(`packages/database/src/schema.ts`) and `AdminService.audit()`/`recentAudit()`
(`apps/api/src/admin/admin.service.ts`) already exist and are already
called from every mutation in `admin-config.controllers.ts` (workflow,
models, prompts, skills, quality-rules, budget — 16 call sites), surfaced
via `GET /admin/settings`. The real, narrower gap: `AdminCharactersController`
and `AdminEnvironmentsController` (`apps/api/src/admin/admin-data.controllers.ts`)
— including the `previewAssetId` character-photo endpoint added earlier
this session — only ever injected `DB`, never `AdminService`, so their
`create`/`update` mutations were completely invisible to the audit trail
while every other admin mutation was tracked. **Fixed:** injected
`AdminService` into both controllers and added the same `admin.audit(...)`
call already used everywhere else, on all 4 mutation endpoints
(`character.create`, `character.update`, `environment.create`,
`environment.update`). **Live-verified, zero cost, on the running dev
API:** created a test environment and updated a catalog character, both
correctly appeared in `GET /admin/settings`'s `audit` array with the right
`userId`/`action`/`entityId`/`payload`; test rows and audit events deleted
afterward. `@shotlin/api` typechecks clean; core suite still 67/67.

**Structured logging correlation (Phase 7), done — closes the last open
item.** Same pattern as the audit-log finding: `createLogger`
(`packages/platform/src/logger.ts`) already existed — a small JSON-line
logger with `scope`/`message`/`meta` — but was never imported anywhere in
the codebase. Every worker log call was a plain `console.log`/`error`/`warn`
with `jobId` string-interpolated into the message and no `attemptId`,
`candidateId`, or `stepRunId` at all, so correlating a log line to a
specific DB row (`job_attempts.id`, `generation_candidates.id`,
`job_step_runs.id`) was only possible via jobId + timestamp guesswork.
Wired up `createLogger` across all 3 worker files
(`apps/worker/src/main.ts`, `processor.ts`, `nodes.ts` — one scoped logger
per file: `worker.main`/`worker.processor`/`worker.nodes`), replacing every
*live* `console.*` call (18 total) with a structured call carrying whatever
correlation IDs are actually in scope at that point — `jobId` always,
`attemptId` from `ctx.attempt.id`/`attempt.id` wherever an attempt exists
yet, plus `candidateId`, `stepRunId`, or `angleKey` at the call sites where
they're meaningful. Left the ~5 `console.log` calls inside the dead
`/* legacy linear runner ... */` comment block in `processor.ts` untouched
— they never execute, matching this session's established precedent of not
touching unreachable fallback-reference code. Also fixed a real
correlation bug while doing this: `main.ts`'s `worker.on("completed"/"failed")`
handlers were logging BullMQ's own `job.id` (which is `retry-<jobId>-<n>`
for retries, not the real DB job id) — now log `job.data.jobId` (the actual
`jobs.id` FK) with `bullJobId` kept alongside for BullMQ-level debugging.
**Live-verified, zero cost:** ran `processGenerationJob` directly against a
real `ready`-state job via a temporary script (cleaned up after) and
confirmed the exact JSON line: `{"ts":"...","level":"info","scope":"worker.processor","message":"job already terminal, skipping","meta":{"jobId":"...","state":"ready"}}`
— proving the wiring, scoping, and field shape all work end to end.
`@shotlin/worker` typechecks clean; core suite still 67/67.

**OpenRouter adapter contract tests (Phase 4), done — found a genuinely
dangerous gap: real tests that silently never ran.**
`packages/providers/src/openrouter.accounting.test.ts` already contained 4
real, well-written, zero-cost tests (mocked `fetch`, no live credits) for
`openRouterChatJson`'s usage/cost accounting. But
`packages/providers/package.json`'s `test` script was
`echo "no tests in providers package"` — no `vitest.config.ts`, no
`vitest` devDependency. Running `pnpm -F @shotlin/providers test` (and
therefore the root `pnpm test` → `turbo run test`, which fans out to every
package) printed that string and reported success without ever executing a
single assertion. This is worse than no tests — a reviewer or CI seeing
`@shotlin/providers:test` pass would reasonably assume the adapter was
covered. **Fixed:** added `vitest.config.ts` (same shape as
`@shotlin/core`'s) and `vitest` devDependency, changed the script to
`vitest run`. **Also closed the actual coverage gap this item asks for:**
`openRouterGenerateImage` — the function that spends real money on every
call, including the fragile seedream-4.5 1K→2K pixel-minimum workaround
found in `packages/providers/src/openrouter.ts` — had zero test coverage
at all. Added `openrouter.generate-image.test.ts`, 9 new mocked-fetch
tests: the seedream resolution upgrade (and that it does *not* apply to
other models), character-reference merging into `input_references`, the
count clamp to OpenRouter's 1–10 range, both image-response shapes
(`b64_json` vs. `url` requiring a second fetch), the no-API-key and
no-images-returned error paths, and usage/cost field mapping. All pass
against the real implementation on the first run (no implementation
changes needed — this was a coverage gap, not a bug). **Live-verified:**
ran `pnpm test` at the repo root — all 10 workspace test tasks pass,
`@shotlin/providers` now genuinely executes 13/13 tests instead of a
no-op echo. Noted but out of scope: `@shotlin/database`'s test script is
the same no-op stub (little pure logic there to test — mostly declarative
schema — so lower priority), and `@shotlin/api`/`@shotlin/worker` have
vitest wired correctly but zero test files (everything in those apps has
been verified live/manually this session, not via unit tests).

---

## 16e. Session Handoff Addendum 4 — 2026-08-23 (Workflow draft/publish/rollback lifecycle, Phase 1 complete)

**What was built:** the full clone-to-draft → validate → publish → rollback
lifecycle (Section 46), replacing in-place production editing. Schema
needed no changes — `workflow_versions.status`
(`draft`/`production`/`archived`) already existed, unused for this purpose.

**API (`apps/api/src/admin/admin-config.controllers.ts`, `WorkflowController`
rewritten):**
- `POST /admin/workflow/draft` — deep-clones production's nodes + configs
  into a new draft version (or returns the existing draft if one is already
  open, so double-clicking never creates duplicates).
- `GET /admin/workflow/versions/:versionId` — nodes for any specific
  version, not just production.
- `PUT /admin/workflow/versions/:versionId/order` and
  `PUT /admin/workflow/versions/:versionId/:nodeKey` — replace the old
  bare `/order` and `/:nodeKey` routes, which edited whichever version was
  production *in place*. Both now reject with 400 unless the target
  version's `status === "draft"` — this is the actual "production becomes
  read-only outside the flow" enforcement the directive asks for. (Bonus
  fix: the old `updateNode` looked up a node by `nodeKey` alone, with no
  `workflowVersionId` filter — a latent bug that only mattered once nodes
  from multiple versions could share a `nodeKey`, which is exactly what
  drafts now make possible. Now correctly scoped.)
- `POST /admin/workflow/versions/:versionId/validate` — structural
  check (required nodes present, the same fixed dependency-graph ordering
  check `reorder` already enforced, extracted into a shared
  `validateNodeOrder` so save-time and publish-time can never silently
  disagree), plus a "billed AI stage enabled with no model bound" check.
  Read-only, safe to call anytime.
- `POST /admin/workflow/versions/:versionId/publish` — re-runs validate,
  then transactionally archives whatever was production and promotes the
  draft, stamping `publishedAt`.
- `POST /admin/workflow/versions/:versionId/rollback` — same swap, but
  only from `archived` back to `production` — lets an operator undo a bad
  publish without needing to hand-reconstruct the old config as a new
  draft.
- `DELETE /admin/workflow/versions/:versionId` — discard a draft that was
  never published (added after live-testing surfaced the need — without
  it, an accidental "Create draft" click had no undo). Only ever allowed
  on a `draft`; production and archived versions are permanent history.
- All five mutating actions audit-logged via the existing
  `AdminService.audit()` (see 16d above).

**Frontend (`apps/web/src/components/workflow-studio.tsx`):** added a
version-switcher strip (chip per version, click to view any version's
nodes), a status banner ("Editing draft vN" vs. "Viewing
production/archived vN"), Create/Continue draft, Publish, Discard draft,
and Roll back buttons shown contextually by the viewed version's status,
and wrapped the node-inspector's editable fields in a
`<fieldset disabled={!isEditable}>` plus gated drag-and-drop/move-buttons
in the canvas — so production is visibly and functionally read-only in the
UI, not just enforced server-side.

**Real bug found and fixed while live-testing in the actual browser (not
just curl):** clicking "Create draft" failed with *"Body cannot be empty
when content-type is set to 'application/json'"*. `apiFetch`
(`apps/web/src/lib/api.ts`) unconditionally set `Content-Type:
application/json` on every request regardless of whether a body was sent;
Fastify rejects that combination outright. Every *existing* call site
happened to always pass a body, so this had never surfaced before — my new
bodyless `POST`/`DELETE` calls (create draft, publish, rollback, discard)
were the first to hit it. Fixed centrally in `apiFetch` itself (only set
the header when `init?.body` is truthy) rather than patching each call
site, since any future bodyless call would otherwise hit the identical
bug.

**Live-verified, zero cost, two ways:**
1. Full lifecycle via `curl` against the running API: created a draft
   (cloned all 10 nodes correctly), confirmed editing production directly
   now 400s, edited the draft, validated it, published it (old production
   correctly archived), rolled back (archived correctly restored to
   production), confirmed a rejected publish-of-non-draft and
   rollback-of-non-archived both 400 correctly, confirmed the edited
   field's value survived the full clone→edit→publish→archive→rollback
   round trip intact, and confirmed discard correctly refuses to delete
   production.
2. Full lifecycle again through the **actual browser** (not just the API):
   logged in, opened Workflow Studio, clicked through Create draft → edited
   a node's timeout via a real form submission → confirmed the new value
   persisted server-side → clicked Publish → confirmed production/archived
   labels updated correctly in the UI → clicked Roll back → confirmed the
   original version was restored. This is what caught the `apiFetch` bug
   above — the curl-only pass had missed it because curl always sends an
   explicit body.

State left in the dev DB: `v1` production (original, untouched), `v2`/`v3`
archived (real history from this verification pass — left in place
deliberately, since deleting archived versions was intentionally never
allowed and this is exactly the kind of realistic history the feature is
meant to preserve).

`@shotlin/api` and `shotlin-web` both typecheck clean; core suite still
67/67. **This closes Phase 1's last open item** — Phase 1 (Correctness
foundation) is now fully complete.

## 16f. Session Handoff Addendum 5 — 2026-08-23 (Character identity packs — Phase 2)

**What was built:** the structured multi-angle character identity pack
(Section 15's character half), extending the single-photo `previewAssetId`
fix from earlier this session into up to 3 role-tagged reference photos
per catalog character (front/¾/full-body), all sent to the image generator
together instead of just one.

**Schema:** new `character_identity_references` table (migration
`0007_dry_maria_hill.sql`) — `characterId`, `role`
(`front`/`three_quarter`/`full_body` enum), `assetId`, unique on
`(characterId, role)` so each role holds at most one photo. Purely
additive; `characters.previewAssetId` is untouched and still works as the
fallback when no pack exists.

**Provider contract change:** `GenerateImageInput.characterReference`
(singular, one photo) → `characterReferences` (array) in
`packages/providers/src/types.ts` and `openrouter.ts` — this is the one
genuinely load-bearing type change, since it's what lets multiple identity
photos actually reach the generator in one request. Updated the mock
provider (didn't touch the field, so no change needed) and the one test
that referenced the old field name
(`openrouter.generate-image.test.ts` — now asserts 3 `input_references`
from 2 garment refs + 2 character photos, still passing against the real
implementation).

**Worker (`apps/worker/src/nodes.ts`):** `resolveCharacterReference` →
`resolveCharacterReferences`, now returns an array. Priority unchanged in
spirit, extended: (1) customer's own upload
(`job.characterAssetId`) still wins outright when present; (2) else, if
the selected catalog character has identity-pack rows, fetch *all* of
them; (3) else, fall back to the character's single `previewAssetId`, same
as before. Both call sites (`runImageGenerate`, `retryFailedAngle`)
updated to pass the array through as `characterReferences`.

**Admin API (`apps/api/src/admin/admin-data.controllers.ts`,
`AdminCharactersController`):** `GET/PUT/DELETE
/admin/characters/:id/identity-references/:role` — attach (upsert, so
re-setting a role replaces rather than duplicates), list, and remove a
role's reference photo. Reuses the same `assertUsableAsset` validation
gate as `previewAssetId` (asset must exist and have cleared upload
validation). All three mutating actions audit-logged.

**Live-verified, zero cost, three ways:** (1) full CRUD cycle via `curl`
against the running API — attached front + three_quarter, confirmed both
listed, confirmed an invalid role 400s, confirmed re-attaching a role
upserts (same row id, new asset, no duplicate) rather than creating a
second row, confirmed delete removes exactly the targeted role; (2) traced
the worker's exact resolution logic in a temporary script (same pattern
used earlier this session for the single-photo version) — confirmed both
identity-pack rows resolve through the real DB → asset → MinIO chain to
actual image bytes (46KB JPEG, 2MB PNG); (3) `pnpm test` at the repo
root — all 10 workspace tasks still pass, including the updated provider
test. All test rows and audit events cleaned up afterward. `@shotlin/providers`,
`@shotlin/worker`, and `@shotlin/api` all typecheck clean.

**Not done / explicitly deferred:** no admin UI yet to manage identity-pack
photos — an operator still has to call the endpoints directly
(curl/Postman) until a form is added to the Workflow Studio or a new
character-management screen (Phase 5/6 territory). The `garment_identity_packs`
/ detail-reference-role half of Section 15-16 (customer-facing UI to tag
detail references by role — border/embroidery/pallu/etc.) is a separate,
not-yet-started piece — `job_inputs.role` already supports it at the
schema level, same as before this session.

## 16g. Session Handoff Addendum 6 — 2026-08-23 (Model capability pre-flight validation, Phase 4)

**Why now, not just "next on the list":** the identity-pack work above
(16f) directly increased the risk this closes — a character can now carry
up to 3 reference photos instead of 1, on top of garment refs and an
anchor image, meaning a single request's reference count is higher than it
used to be. Nothing checked that count against what the configured model
actually supports before spending on the request.

**What was found:** `model_registry.capabilities` (jsonb) already existed
with exactly the right shape documented in a schema comment
(`{ maxImageRefs, resolutions, supportsMultiOutput }`), admin-editable via
the existing `/admin/models` endpoint, and seeded with real values for the
production model (Nano Banana 2: `maxImageRefs: 14`,
`resolutions: ["1k","2k","4k"]`, `supportsMultiOutput: false`) — but
nothing in the worker ever read it. A request could be built with more
references than a model accepts, or a resolution it doesn't support, and
the only way to find out was a live, paid, likely-confusing provider
failure.

**Fixed:** `packages/core/src/model-capabilities.ts` — `parseModelCapabilities`
(tolerant parse of the free-form JSON column; a missing or malformed field
degrades to "unconstrained on that dimension," never to a thrown error,
since an incomplete admin-edited capabilities object shouldn't make a
model unusable) and `checkModelCapabilities` (checks reference count vs.
`maxImageRefs`, resolution vs. `resolutions`, and `count > 1` vs.
`supportsMultiOutput`, in that order). 13 new unit tests. Wired into both
`generateImage` call sites in `apps/worker/src/nodes.ts` —
`runImageGenerate`'s `generateAngle` closure (covers both the anchor and
every fan-out angle, one insertion point) and `retryFailedAngle`'s
single-angle retry — computing the real reference count
(`references.length [+ anchor] + characterReferences.length`) right
before the provider call and refusing to spend if it fails, throwing a
`ProviderError` with the specific reason rather than a generic failure.

**Live-verified, zero cost:** ran the real `checkModelCapabilities` against
the *actual* production `image_generator` model row read live from the
DB (not a hand-typed fixture) — a realistic 5-reference request at 2k
passed cleanly (confirming the real seeded limits, `maxImageRefs: 14`,
comfortably cover normal usage and this check won't false-positive against
real jobs), a 20-reference request was correctly rejected with
`"This model accepts at most 14 reference image(s), but 20 were
provided."`, and an unsupported `"8k"` resolution was correctly rejected
too. `@shotlin/core` and `@shotlin/worker` typecheck clean; core suite now
80/80 (was 67); `pnpm test` at the repo root still 10/10 workspace tasks.

**Not attempted:** the FASHN adapter interface and OpenRouter-adapter
contract tests beyond what was already added (16d) are the remaining
Phase 4 items — FASHN specifically needs real credentials and confirmed
intent to add a second provider, neither of which exist yet.

## 16h. Session Handoff Addendum 7 — 2026-08-23 (Camera-angle picker UI, Phase 6)

**What was built:** the backend has fully supported explicit
`cameraAngles[]` selection since earlier this session (`resolveAngleSet`
in `@shotlin/core`, accepted by the job-creation API), but the customer
UI only ever sent `outputCount` and let the server pick the default set —
there was no way for a customer to choose *which* angles they wanted, only
how many. `apps/web/src/components/generator.tsx`'s "Output" section now
shows a row of toggle chips (Front / 3/4 Left / 3/4 Right / Side Profile /
Back) whenever the selected set size is more than 1 image. Picking is
opt-in — leave it alone and the server's default set is used exactly as
before; pick specific angles (up to the set size) and those are sent
instead, with a "Reset to default" control to clear back to opt-in.

**Correctness decision, not just plumbing:** rather than hand-duplicating
the angle vocabulary and default-set logic client-side (real drift risk —
two independent copies of "what's the default set for 3 images" that
could silently disagree), the component now imports `CAMERA_ANGLES` and
`resolveAngleSet` directly from `@shotlin/core` (already a dependency of
`apps/web`). The customer's selection — however many angles, in whatever
order — is run through the exact same `resolveAngleSet` the worker uses,
so the live preview in the "Reference rail" panel can never drift from
what the server will actually resolve, including its top-up behavior:
picking just one non-default angle (e.g. "Back" with a 3-image set) fills
the remaining slots from the default set rather than silently generating
fewer images than requested.

**Real bug caught and fixed during live testing, before it shipped:** the
first implementation *did* hand-duplicate the default-set logic
client-side. Live-testing in the browser showed the exact drift this was
worried about: selecting one non-default angle collapsed the visible
preview to just that one angle, while the server would have actually
resolved and generated 3. Fixed by switching to the shared `@shotlin/core`
import before this ever reached the user — caught in this session's own
verification pass, not after the fact.

**Live-verified in the actual browser** (job creation itself was not
triggered — that would spend real money against the live, non-mocked
OpenRouter key): set size → 3 images correctly reveals the picker with the
right "pick up to 3" copy; selecting "Back" alone correctly previews
"Back · Front · 3/4 Left" (proving the top-up fix); selecting a 3rd angle
correctly disables the remaining unselected chips (cap enforcement); "Reset
to default" correctly clears the selection and hides itself; set size → 1
image correctly hides the picker entirely (no angle choice needed for a
single frame). `shotlin-web` typechecks clean; `pnpm test` still 10/10.

## 16i. Session Handoff Addendum 8 — 2026-08-23 (Detail-reference role tagging, Phase 2/6)

**What was found:** the job-creation API already accepted up to 5
`detailAssetIds` and persisted them as `role: "detail"` job-input rows —
but every detail photo was generic, undifferentiated "detail," with no way
to know whether a given reference showed the border, the embroidery, the
neckline, or something else. Worse: the customer-facing UI had **zero**
detail-reference upload capability at all — `generator.tsx` only ever had
the one main-garment dropzone, so this backend capacity was completely
unreachable from the actual product.

**What was built:**
- Schema: new `detail_kind` enum (`border`/`embroidery`/`pattern`/`neckline`/`sleeve`/`pallu`/`other`)
  and a nullable `job_inputs.detail_kind` column (migration
  `0008_spooky_trauma.sql`), only meaningful when `role='detail'`.
- API: `createJobSchema.detailAssetIds: string[]` →
  `detailReferences: Array<{ assetId, kind }>` (`apps/api/src/jobs/jobs.module.ts`)
  — a clean shape change, not a backwards-compat shim, since this is an
  internal API with no external consumers.
- Frontend: `generator.tsx` now has an actual detail-reference upload UI —
  up to 5 photos, each uploaded through the existing presign flow
  (`kind: "detail_reference"`, already a valid asset kind) with a
  per-photo dropdown to tag which part of the garment it shows, and a
  remove control. Previously this was simply not buildable by a customer
  at all.

**Explicitly not built, and said so up front:** the detail-kind tag is
captured and stored, but nothing in vision analysis or prompt compilation
reads it yet — the worker still fetches all non-character job inputs as
one undifferentiated reference list. Using the tag to do a real per-detail
cross-check against the Garment Truth Sheet's own `protectedDetails` is
the fuller Section 18 vision, and that needs live vision-model work this
session already correctly deferred (OpenRouter key limit) — this pass
only closes the "customer literally cannot upload or tag a detail photo"
gap, which was real and total.

**Live-verified, zero cost:** the Zod schema for the new shape checked in
isolation (valid kind accepted, invalid kind rejected, missing kind
defaults to `"other"`, invalid UUID rejected, over-5 rejected). In the
actual browser: uploaded a real file through the new detail-reference
flow (simulated via `DataTransfer`, exercising the real presign → PUT →
complete pipeline, not a mock), confirmed the card rendered with the
default "other" tag, changed the tag to "border" and confirmed the select
reflected it, removed the card and confirmed it disappeared. The
test-uploaded asset was cleaned up from both MinIO and Postgres
afterward. Job creation itself was not triggered — that spends real money
against the live, non-mocked OpenRouter key. `@shotlin/api`,
`@shotlin/worker`, and `shotlin-web` all typecheck clean; `pnpm test`
still 10/10.

## 16j. Session Handoff Addendum 9 — 2026-08-23 (Cost breakdown dashboard, Phase 5)

**What was found:** `AdminService.costSummary()` (`apps/api/src/admin/admin.service.ts`)
already computed a full aggregate spend breakdown with real SQL — today vs.
all-time totals, spend by model, spend by provider, a 14-day daily trend,
cost per delivered image by resolution, and money spent on jobs that never
delivered — exposed via `GET /admin/costs`. But the frontend's "Budget &
cost" tab only ever called `GET /admin/costs/history` (the per-job table);
the aggregate summary endpoint was never called from anywhere. Same class
of gap as the admin audit log and structured logger earlier this
session: real, computed, exposed — just never wired into the UI.

**Fixed:** new `CostSummaryPanel` component in
`apps/web/src/components/workflow-studio.tsx`, mounted above the existing
per-job history table in the Budget & cost tab. Reuses existing CSS
classes (`.state-grid`/`.state-card` for the metric tiles, `.chart`/`.bar-wrap`/`.bar`
for the daily trend) rather than inventing new ones. While wiring it up,
also fixed a real readability gap in the API response itself:
`costSummary().byModel` returned raw `model_registry` UUIDs with no name
— every other cost-related endpoint (`/admin/costs/history`) already
resolves names via `AdminService.modelNamesById()`, but the base `/admin/costs`
route never did. Added the same resolution to `AdminCostsController.costs()`,
handling the one real edge case correctly: `cost_events.model_id` is
nullable (deterministic/free steps have no billed model), so a null-key
lookup now reads "Deterministic / no model" instead of crashing — caught
by `tsc`, not by luck (`Type 'null' cannot be used as an index type`).

**Live-verified in the actual browser against real data** — this session's
own earlier test jobs: ₹178.00 all-time spend, broken down correctly by
model (`OpenRouter · Seedream 4.5`, `OpenRouter · Qwen 3.8 27B · vision`,
etc. — real names, not UUIDs), by provider, a 2-day trend chart, cost per
delivered image (₹13.75/image at 2K, ₹4.59/image at 1K), and ₹24.50 spent
across 6 jobs that never delivered. All numbers matched what the per-job
history table below it already showed, cross-checked. `@shotlin/api` and
`shotlin-web` typecheck clean; `pnpm test` still 10/10.

**Phase 5 scoping note:** the "quality dashboard" half of this phase item
was already substantially built and rendered (Overview tab already shows
`topDefects`, `firstPassAcceptance`, `resolutionMix` from
`AdminService.overview()`) — confirmed via live browser check earlier this
session, not assumed. Benchmark suite UI and character/garment identity
pack *management screens* (as opposed to the CRUD endpoints themselves,
which do exist) remain open, the former blocked on Phase 8's dataset.

## 16k. Session Handoff Addendum 10 — 2026-08-23 (Smarter input-quality gate — real bug report, two real fixes)

**Trigger:** the user hit a real rejection in the running app — job
`8e447695-8937-4d5f-95ef-e0de6ea7a32f` failed with *"Input rejected: Image
too small: 316x963 (min 512px); Image appears blurry (variance 45.6 <
threshold 100)"* — and asked, reasonably, why a soft/undersized photo has
to kill the whole job outright instead of the pipeline trying to work with
it. This wasn't a planned roadmap item; it's a direct response to a live
bug report, confirmed with the user's explicit go-ahead on the scoped
design before building.

**Bug #1 — the real gate design flaw.** `input_check`
(`apps/worker/src/nodes.ts`) hard-rejected the *entire job* on two
different failure classes it treated identically: an image with no real
signal at all (wrong type, corrupted, absurdly tiny) and an image that's
merely imperfect (below the ideal 512px, or soft/blurry). Only the first
class actually deserves a hard stop — the second is exactly the kind of
judgment call a vision model, which actually looks at the photo, makes far
better than a blind pixel/Laplacian-variance heuristic.

**Fix — redesigned into two tiers, not one:**
- `packages/core/src/input-validation.ts`: `validateImageInput` now returns
  `reasons` (hard failures: bad type, oversized, corrupted, or below a new
  *non-admin-configurable* `absoluteMinDimension: 128` — no upscale rescues
  that) separately from `warnings` (soft signals: below the *ideal*
  `minDimension` → `needsUpscale: true`; blurry → a warning string). 9 unit
  tests (was 5), including one built directly from the real failure case
  (316×963, variance 45.6) to prove it now proceeds instead of rejecting.
- `packages/platform/src/image-utils.ts`: new `upscaleToMinDimension`
  (Lanczos3, format-preserving, no-op if already large enough) — plain
  interpolation, explicitly documented as *not* a blur fix, just a
  reliable, zero-AI-cost fix for "too small."
- `assets.enhancedAssetId` (migration `0009_previous_malcolm_colcord.sql`,
  self-referencing, nullable) — when `input_check` upscales an image, the
  result is stored as a genuinely *separate* asset, never overwriting the
  original (the schema's own comment already says originals are immutable;
  this respects that rather than working around it).
- `resolveReferenceImages` — new shared helper in `nodes.ts` replacing 5
  near-identical duplicated fetch blocks (`runVision`, `gateOnAnchorReview`,
  `retryFailedAngle`, `runImageGenerate`, `runQualityReview`,
  `runSecondReview`). Prefers the enhanced asset when one exists, and
  surfaces the original's warnings — so every reader (generation *and* QA
  review) sees the same upscaled version consistently, and none of them can
  independently forget to check for one.
- `runVision`'s system prompt now gets an explicit note appended when
  warnings exist: *"NOTE ON SOURCE IMAGE QUALITY: ... Use your best
  judgment for any detail this affects, report it under uncertainDetails,
  and lower your confidence score accordingly rather than guessing with
  false certainty."* This is the semantic half of what the user actually
  asked for. No changes were needed in `prompt_compile` — it already
  surfaces the truth sheet's `confidence` and `uncertainDetails` fields
  into the generation prompt; that machinery already existed, it just
  needed `input_check` to stop blocking vision from ever running.

**Bug #2 — found while diagnosing, unrelated to the gate design itself.**
The job's own state history proved a second, real bug:
`validating → input_rejected` (correct, specific — the customer UI labels
this "Reference rejected") immediately followed 19ms later by
`input_rejected → failed` (the customer UI labels this generic "Generation
stopped"). `runInputCheck` throws after setting the specific state, and
`processGenerationJob`'s outer catch-all (`apps/worker/src/processor.ts`)
unconditionally overwrites whatever state was already set with a generic
`failed`/`manual_review` fallback — clobbering the more specific, more
actionable state. This is exactly why the user's screenshot said
"Generation stopped" instead of something that would have hinted at "fix
your upload." Fixed: the catch block now checks the job's current state
first and skips the generic overwrite when it's already `input_rejected`.

**Live-verified, zero cost, several ways:**
- `validateImageInput` against a case built from the exact real numbers
  (316×963, variance 45.6) — proven via the new unit test.
- `upscaleToMinDimension` against a real 316×963 JPEG generated with
  `sharp` (matching the real failure case exactly): correctly produced
  512×1560 (aspect-ratio preserved), re-extracting metadata from the
  result confirmed the new dimensions, re-validating confirmed
  `needsUpscale` cleared while the blur warning correctly persisted
  (upscaling doesn't fix blur — proven, not just claimed), and a
  no-op case (already-large image) correctly returned untouched.
- `resolveReferenceImages`'s enhanced-asset preference against real DB +
  MinIO data: temporarily linked two real existing assets via
  `enhancedAssetId`, ran the exact resolution logic, confirmed it fetched
  the enhanced asset's actual bytes (24,784 bytes) rather than the
  original's (21,313 bytes) — reverted afterward.
- The state-clobbering bug was confirmed against the real failing job's
  own `job_state_events` row, not inferred — the exact `input_rejected →
  failed` transition, 19ms apart, is sitting in the live database.
- `pnpm test` at the repo root: 10/10, including 9 tests in the rewritten
  `input-validation.test.ts` (core suite now 83/83, was 67 at the start of
  this session). `@shotlin/core`, `@shotlin/platform`, `@shotlin/worker`,
  `@shotlin/api`, and `shotlin-web` all typecheck and build clean.

**What's still not provable without live AI spend:** whether the vision
model, given a soft/undersized reference and the new quality-warning
prompt note, actually produces a *good* generation result. The mechanism
is built and every deterministic piece of it is proven; whether it
improves real output quality needs a live vision + generation call against
the OpenRouter key, which is still capped. This stays exactly where
everything else pending live verification has stayed all session.

**Explicitly not built:** no customer-facing indication that a photo was
auto-upscaled or flagged as soft (e.g., "we enhanced your reference photo"
messaging) — the mechanism is entirely internal for now. Could be a nice
trust/transparency signal later, but wasn't part of what was asked.

## 16l. Session Handoff Addendum 11 — 2026-08-23 (Customer-facing image model selection)

**Trigger:** direct user request — before hitting Generate, the customer
should be able to pick which image-generation model runs their job,
instead of it being purely an admin-configured, workflow-wide binding.

**Reality check before building:** only one `image_generator` model is
currently enabled in the live registry (`OpenRouter · Seedream 4.5`) — a
second, "Nano Banana 2," exists in `seed.ts` but was swapped out in the
live DB at some point without the change ever reaching this session's
tracking. Built the feature to be genuinely useful today (the customer
gets a real, working dropdown) *and* to scale automatically the moment a
second model is enabled — no further code changes needed then.

**What was built:**
- `jobs.imageModelId` (migration `0010_magenta_tony_stark.sql`, nullable,
  references `model_registry.id`). Null = unchanged existing behavior
  (use the production workflow's configured binding).
- `GET /customer/models` (`apps/api/src/customer/customer.module.ts`) —
  lists enabled `image_generator` models with only the fields safe to show
  outside admin (`id`, `name`, `notes`).
- `createJobSchema.imageModelId` (`apps/api/src/jobs/jobs.module.ts`),
  validated against the registry (must exist, be `image_generator` role,
  be enabled) before a job is created — same pattern as the existing
  character/environment checks in the same function.
- `loadJobData` (`apps/worker/src/db.ts`): after building the normal
  role→model map, a job's explicit `imageModelId` overrides the
  `image_generator` entry — fetched directly by ID, not re-gated on
  `isEnabled` (a customer's already-validated choice shouldn't be
  retroactively broken if an admin disables that model before the job
  processes).
- `createExecutionManifest` (`apps/api/src/jobs/jobs.module.ts`) applies
  the identical override to `modelsSnapshot`, so the immutable
  per-job snapshot stays truthful about which model the job actually
  used, not just the workflow's role-default — this matters once the
  worker eventually reads from the manifest instead of live config
  (still-deferred half of Section 8, unchanged by this addition).
- Customer UI (`generator.tsx`): a "Image model" selector in the Output
  section, shown whenever at least one model exists, auto-selecting the
  first one. Caption reads "The pipeline will pick the right model" with
  one option, switching to "Choose your model, or let the pipeline pick"
  once there's a real choice — so the copy never oversells a single-option
  dropdown as a meaningful decision.
- **Real, unrelated data bug caught in passing:** the one enabled model's
  admin `notes` field literally described a *different* model ("Nano
  Banana 2 through OpenRouter's dedicated Image API...") — stale from
  before someone swapped the row to Seedream 4.5 without updating the
  note. Harmless while `notes` was admin-only; became actively wrong and
  customer-facing the moment this feature exposed it. Corrected directly
  in the live DB (`seed.ts` itself was never wrong — it still correctly
  describes the Nano Banana 2 row it seeds; this was purely a live-data
  drift from a later admin edit).

**Live-verified, zero cost:**
- `GET /customer/models` against the running API — returns exactly the
  one real enabled model with correct, now-accurate `notes`.
- The override mechanism itself, the part that actually matters: inserted
  a second, clearly-marked test model (`TEST · Alt Image Model`),
  temporarily pointed a real completed job at it via `imageModelId`, ran
  the real `loadJobData` against it, and confirmed `modelsByRole.get("image_generator")`
  resolved to the test model — not the role's normal default — proving the
  override actually takes effect. Both the test model and the job's
  temporary field were reverted immediately after.
- Browser: the picker renders with the correct option and auto-selects
  it; the caption text correctly reflects the single-option case. Job
  creation itself was not triggered — same reason as always this session
  (real OpenRouter spend), though the user is raising the account's spend
  limit right now, which should finally unblock a real end-to-end pass.

`@shotlin/database`, `@shotlin/api`, `@shotlin/worker`, and `shotlin-web`
all typecheck and build clean; `pnpm test` still 10/10.

## 16m. Session Handoff Addendum 12 — 2026-08-23 (OpenRouter-backed model catalog — admin discovery + auto-capability detection)

**Trigger:** immediate follow-up to 16l — the user asked why the new
customer picker only showed one model when "OpenRouter has a lot of
other models." The honest answer: the picker was never meant to show
OpenRouter's raw catalog, only this app's curated `model_registry` — and
there was **no admin UI at all** to add to that registry (the "Models" tab
was a read-only table; adding a model required a raw API call). The user
pushed back on "just expose the raw catalog to customers" (real risk:
unknown pricing, unvetted quality, models that can't even accept a
reference image) and asked for the actual right thing instead: let the
admin discover real OpenRouter models with their real capabilities and
pricing, and auto-detect limitations instead of guessing them.

**Research before building, not assumption:** fetched OpenRouter's live
API directly (free metadata calls, zero generation cost) to find out what
capability data actually exists, rather than guessing. Two real findings:
1. OpenRouter has a **dedicated image-generation catalog**
   (`GET /api/v1/images/models`, currently 43 models) — completely
   separate from the general chat-completions `/models` list. This
   explains something that would otherwise have looked like a bug:
   `bytedance-seed/seedream-4.5` (this app's only configured model)
   doesn't appear in the general catalog at all, only the dedicated one.
2. Each model's per-endpoint detail
   (`GET /api/v1/images/models/{id}/endpoints`) returns genuinely
   structured capability data — `resolution.values`, `input_references.max`,
   `n.max` — plus real per-image USD pricing. This maps almost exactly
   onto `ModelCapabilities` from `packages/core/src/model-capabilities.ts`
   (built two turns ago for pre-flight validation): `input_references.max`
   → `maxImageRefs`, `resolution.values` → `resolutions`, `n.max > 1` →
   `supportsMultiOutput`. The pre-flight check I built earlier can now be
   fed real data instead of hand-typed guesses.

**What was built:**
- `GET /admin/models/discover` (`apps/api/src/admin/admin-config.controllers.ts`) —
  proxies OpenRouter's dedicated image-model catalog, filtered to models
  with at least one supported reference image (`input_references.max > 0`)
  — a model that can't accept a reference photo is fundamentally unusable
  here, not just untested, so it's excluded outright rather than merely
  flagged.
- `GET /admin/models/discover-detail?modelId=...` — per-model capabilities
  + pricing, normalized to the exact shape `model_registry.capabilities`
  expects. `modelId` travels as a query param (not a path segment) since
  OpenRouter IDs contain `/`.
- New `ModelsPanel` component (`apps/web/src/components/workflow-studio.tsx`,
  wired into `apps/web/src/app/admin/page.tsx`'s Models tab, replacing the
  old read-only table) — the registry table (now with a working
  enable/disable toggle, which also didn't exist before), plus a
  search-and-browse flow over the live OpenRouter catalog with a
  capability+pricing preview card, and an "Add to catalog" action that
  calls the existing `POST /admin/models` with the fetched data pre-filled.
  New models are added **disabled by default** — this tool makes discovery
  and data-entry fast, but going live is still an explicit admin decision,
  not automatic.

**Live-verified, zero cost, the full loop, in the actual browser:**
logged in, opened the new Models tab, loaded the real 43-model catalog,
searched "nano banana", picked "Nano Banana 2 (Gemini 3.1 Flash Image)",
confirmed the preview showed real data (`512, 1K, 2K, 4K` resolutions —
note the non-K-based `512` value, which the code handled correctly without
assuming a fixed enum; `14` max reference images; `$0.0001`/image — genuinely
cheap, genuinely real), clicked "Add to catalog" and confirmed it appeared
in the registry disabled, toggled it on and confirmed the state flipped,
then navigated to the customer generation page and confirmed **both**
Seedream 4.5 and the newly-added Nano Banana 2 now appear in the customer
picker — closing the loop all the way from "admin discovers a model" to
"customer can select it." Toggled the test addition back off afterward —
it was added to prove the mechanism works, not because "should this
specific model go live" is a decision that's mine to make; the row stays
in the registry, disabled, for the user to review and enable through the
same tool whenever they choose.

`@shotlin/api` and `shotlin-web` typecheck clean; `pnpm test` still 10/10.

**Not built:** no admin UI to *edit* an existing model's capabilities/price
after adding it (the underlying `PUT /admin/models/:id` endpoint already
supports this and was used for the enable/disable toggle, but there's no
form for the other fields yet — still curl/API-only for edits beyond
on/off). No re-sync mechanism to detect when OpenRouter changes a model's
capabilities or pricing after it's already in the registry — the snapshot
is taken once, at add-time.

## 16n. Session Handoff Addendum 13 — 2026-08-23 (Real bug: misleading "completed" label on a failed generation)

**Trigger:** the user picked a newly-added model (Google: Nano Banana Pro,
`google/gemini-3-pro-image`) from the picker built in 16l/16m, hit
Generate, and the job failed — but the customer-facing run trace showed
**"Creating image: completed"** immediately above the error explaining
that image generation had just failed. Confusing and worth taking
seriously as a real bug, not dismissed as "well the job did fail so it's
fine."

**Root cause, confirmed against the real job's data (`d9e488ac-ea90-4564-aee3-0351e5361823`),
not guessed:** `apps/web/src/app/jobs/[id]/page.tsx`'s run-trace timeline
was built entirely from `job_state_events.toState` — i.e., "did the job
*enter* this phase" — not from the actual `job_step_runs` status for that
node. The job transitions to `"generating"` right before the
`image_generate` node runs, so that state lands in `stateEvents`
regardless of whether the provider call inside that phase then succeeds or
fails. The job's real state history for this job was exactly
`validating → analyzing → compiling → generating → failed` — "generating"
was recorded, so the old logic showed it as "completed," full stop, with
no way to distinguish "we finished this phase" from "we merely started it
before dying."

**Fix:** a step is only shown as "completed" if a *later* step's state was
also recorded (proof the pipeline moved past it). The step where the job
actually stopped — recorded, but with no later state ever recorded, and
the job sitting in one of the failure-terminal states — now shows
"stopped here" with a red dot instead of a green "completed." Earlier
steps that genuinely finished are unaffected.

**Live-verified, zero cost, two ways (couldn't drive the browser directly —
the customer job page is ownership-gated even to the admin account, and
the job belongs to the user's own customer login, not admin):**
1. Traced the exact new logic by hand against the real failing job's real
   `job_state_events` rows — confirms `validating`/`analyzing`/`compiling`
   → "completed", `generating` → "stopped here", everything after → "not
   run", matching exactly what should have been shown instead of the
   misleading label.
2. Traced the same logic against a real, fully-successful job's state
   history (19 events across 3 attempts, `ready → ...`) to confirm the fix
   doesn't regress the success path — every step still correctly resolves
   to "completed," including the final "Ready to use" step (which is
   deliberately *not* in the failure-terminal set, so it's never
   mislabeled "stopped here").

`shotlin-web` typechecks clean; `pnpm test` still 10/10.

**Separately — the actual generation failure itself, likely not a code
bug at all:** the job's stored `truth_sheet` shows the vision model
described the uploaded reference in explicit lingerie/intimate-apparel
terms ("Bra: two molded lace cups...", "Panty: brief cut... solid red
panel at center front/crotch...") despite `garmentType` being tagged
`"lehenga"` — and `confidence: 0`, consistent with the model being
genuinely thrown by a category mismatch between the selected garment type
and what the photo actually shows. Google's Gemini-family image models
(this job used Nano Banana Pro) are known to have stricter content
policies than other providers; `finish_reason: "IMAGE_OTHER"` with
`block_reason: null` reads as a soft, non-explicit content-based refusal,
not a technical error. This is consistent with every earlier successful
generation this session having used Seedream 4.5, not a Gemini-family
model. Flagged to the user directly rather than silently — this isn't
something a code fix addresses; it's a provider content-policy difference
worth knowing when picking a model for this kind of reference.

## 16o. Session Handoff Addendum 14 — 2026-08-23 (Real one-click image downloads)

**Trigger:** direct user request, right after confirming a live generation
finally worked end-to-end — download should behave like ChatGPT's image
download (one click, saves immediately), and there should be a "download
all" for a multi-angle set instead of clicking through each image one at a
time.

**What was actually there before:** a plain `<a href={signedUrl}
target="_blank">` — for a cross-origin S3/MinIO URL, browsers generally
just *open* that in a new tab rather than triggering a real download; the
user still has to right-click → Save As. Not what was asked for.

**Verified before building, not assumed:** the reliable, cross-browser way
to force a real save is to fetch the file into memory and trigger the save
from a same-origin `blob:` URL, not just navigate to the signed URL. That
only works if the browser's `fetch()` is actually allowed to read the
cross-origin response — so before writing any code, generated a real
presigned MinIO URL and checked its CORS headers directly with `curl`
(`Origin: http://localhost:3100`). Confirmed MinIO already returns
`Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true` —
the fetch-and-blob approach would work, not just navigation.

**What was built** (`apps/web/src/app/jobs/[id]/page.tsx`):
- `forceDownload(url, filename)` — fetches the image, builds a `blob:`
  object URL, triggers a save via a temporary anchor's `download`
  attribute, revokes the object URL after. This is what makes it an actual
  one-click save instead of an inline-view.
- The existing single-image download button now calls this instead of
  navigating.
- New "Download all N" button (shown whenever a job delivered more than
  one image) — downloads every delivered angle in sequence, with a 400ms
  stagger between each trigger (browsers can silently drop several
  download triggers fired in the same tick with no gap between them).
- Errors surface inline rather than failing silently.

**Live-verified, zero cost, against a real 5-image job**
(`84bf33ef-a69b-4884-bffe-00d9f6c1ef3b`, real `ready` job, not staged):
clicked "Download all 5" in the actual browser and confirmed via network
inspection that all 5 real PNG outputs (`1-1.png` through `1-5.png`) were
fetched with genuine 200 OK responses from MinIO; the button correctly
showed "Downloading…" mid-flight and returned to "Download all 5"
afterward with no error shown. Also clicked the single-image "Download
Front" button and confirmed no error. Checked the browser console — no
errors either way. `shotlin-web` typechecks clean; `pnpm test` still
10/10.

**Note on the customer job I initially tried to test against:** the
customer-facing job pages are strictly ownership-gated by `userId`, even
to the admin role — an admin session can't view another user's job
through this page. Discovered mid-session that every job in the local
database actually belongs to one of two admin-role accounts
(`shotlin085@gmail.com`, `admin@shotlin.local`) — there is no separate
customer account in this environment yet, which is why `admin@shotlin.local`
having its own real 5-image job was what made this verification possible
at all.

## 16p. Session Handoff Addendum 15 — 2026-08-23 (Real bug: 4K capability wrongly reported as unsupported for a multi-endpoint model, plus a related pricing-unit bug found while investigating)

**Trigger:** direct user report — generating with "Nano Banana Pro" (a
model the user added themselves via the admin catalog browser built in
16m) showed 4K as unsupported, but the user had just checked the real
OpenRouter page for that model and confirmed 4K generation is available
there and actually usable.

**Root cause, confirmed live before touching any code:** OpenRouter's
`GET /api/v1/images/models/{id}/endpoints` can return **multiple provider
endpoints for one model**, each with its own `supported_parameters` and
`pricing` — OpenRouter auto-routes each request to whichever endpoint can
serve it. `discoverDetail`
(`apps/api/src/admin/admin-config.controllers.ts`, `ModelsController`)
only ever read `payload.endpoints?.[0]` — the first endpoint in the list —
and treated its capabilities as the model's whole capability set. Curled
the real endpoint (`.../google/gemini-3-pro-image/endpoints`, the model
backing "Nano Banana Pro") directly and confirmed there are genuinely two
providers: "Google Vertex" (no 4K in its `resolution.values`) and "Google
AI Studio" (4K present). Whichever one happened to be listed first
determined what the admin catalog showed — in this case, Vertex, silently
hiding a capability that a real request would actually be able to use.

**Second, related bug found while investigating (not reported by the
user):** the same function's pricing extraction did
`endpoint.pricing?.find(p => p.billable === "output_image")` with no check
on `unit`. OpenRouter's pricing entries can be `unit: "image"` (a flat
per-image cost) or `unit: "token"` (a per-token cost) — this model's
pricing entry was `unit: "token"`, `cost_usd: 0.00012` (i.e. $0.00012 per
output token, not per image), but the old code stored it directly into
`suggestedImagePrices`/`model_price_versions.image_prices` as if it meant
$0.00012 *per image*. Confirmed live in the DB: the row for this model
(`model_price_versions.id = 345fa4e3-a1d5-4406-a800-87ba8bda745d`) held
exactly `{"1k": 0.00012, "2k": 0.00012}` under `image_prices` — a
2–3-orders-of-magnitude-wrong number if ever used as a real per-image
fallback cost. Real-world severity was partially mitigated (not zero) by
`calculateCost` (`packages/core/src/cost-engine.ts`) prioritizing
`providerReportedCostUsd` from the live API response over any configured
fallback price whenever OpenRouter reports one — which it normally does
for image generations — but the stored fallback was still objectively
wrong and would have applied on any call where the provider didn't report
a cost.

**Fixed, both in `discoverDetail`:**
1. Iterate **all** endpoints, not just the first: union every endpoint's
   `resolution.values` into one set, take the max of `input_references.max`
   (→ `maxImageRefs`) and `n.max` (→ `supportsMultiOutput`) across all of
   them — the model's real capability is the union OpenRouter can actually
   route to, not whichever provider happened to sort first.
2. Split pricing by `unit`: only `unit === "image"` entries populate
   `pricePerImageUsd`/`suggestedImagePrices` now; `unit === "token"`
   entries are surfaced separately as a new `perTokenPriceUsd` field
   instead of being silently mislabeled as a flat image price. Also now
   returns `providers: string[]` (the endpoint names) so the admin UI can
   show which providers back a model.

**Live-verified, zero cost:** re-curled the real OpenRouter endpoint
against the fixed code path (logged in as `admin@shotlin.local`) and
confirmed the corrected output: `{"capabilities":{"resolutions":["1k","2k","4k"],"maxImageRefs":14,"supportsMultiOutput":false},"pricePerImageUsd":null,"suggestedImagePrices":null,"perTokenPriceUsd":0.00012,"providers":["Google Vertex","Google AI Studio"]}`
— 4K now correctly present, no more mislabeled per-image price.
`@shotlin/api` typechecks clean (`tsc --noEmit`, no output).

**Corrected the already-bad stored data directly** (this was actively
causing the user's rejection right now, not just a code-path fix for
future lookups): for the live `model_registry` row
(`id = dff5a75d-ce8b-49d6-9732-aa80a1b934b1`, "Nano Banana Pro"), updated
`capabilities` to `{"resolutions": ["1k", "2k", "4k"], "maxImageRefs": 14,
"supportsMultiOutput": false}` via direct SQL (confirmed `UPDATE 1`).
For the paired `model_price_versions` row
(`id = 345fa4e3-a1d5-4406-a800-87ba8bda745d`), cleared the wrong
`image_prices` (set to `NULL` — a real flat per-image price can't be
safely derived from a per-token rate without knowing real average
tokens-per-image, so guessing a number would just be a different wrong
number) and set `output_price_per_m = 120` (i.e. $0.00012/token ×
1,000,000, the correct token-based fallback rate in the schema's existing
`outputPricePerM` field) — confirmed via `SELECT`.

**Full closing verification:** `pnpm -F @shotlin/api exec tsc --noEmit`
clean; `pnpm test` at the repo root — all 10 workspace tasks pass, core
suite 83/83.

**Not done / explicitly deferred:** the `ModelsPanel` admin UI
(`apps/web/src/components/workflow-studio.tsx`) doesn't yet surface the
new `perTokenPriceUsd` or `providers` fields in the discovery preview card
— it will currently just show "—" for price on a token-billed model,
which is honest (no longer wrong) but not yet informative. A small
follow-up UI change, not attempted this pass since the user's actual
report (wrong 4K capability blocking generation) is now fixed and
verified. Any *other* already-added catalog model with the same
first-endpoint-only or per-token-as-per-image mislabeling has not been
swept and corrected — only the specific model the user reported was
checked and fixed; a full re-sync of every catalog row against the fixed
`discoverDetail` logic would need a small one-off script if the user wants
it done proactively.

## 16q. Session Handoff Addendum 16 — 2026-08-23 (Real bug: vision step failing on malformed JSON from the model)

**Trigger:** immediately after 16p, the user hit a *different* live
failure on a real job — retrying 4K generation now got past the
capability check but the run stopped at the `vision` step ("Reading
garment details") with `OpenRouter output failed schema validation
twice: Expected ',' or ']' after array element in JSON at position 436
(line 28 column 6)`. Confirmed via direct DB query
(`job_step_runs` for the real failed job, id `ce9d24f4-3b12-4874-8182-67e31010d781`)
that this was a genuine, reproducible failure, not a stale UI artifact —
`input_check` succeeded, `vision` failed with exactly that error message.

**Root cause:** `extractJson` (`packages/providers/src/openrouter.ts`)
does a bare `JSON.parse` on the slice between the first `{` and last `}`
in the model's response. `openRouterChatJson` already retries once on
parse failure (`packages/providers/src/openrouter.ts`'s 2-attempt loop),
but both attempts hit the same failure class, so the job stopped. The
specific error signature — "Expected ',' or ']' after array element" —
is the textbook symptom of a **literal, unescaped `"` inside a JSON
string value**: when a vision model writes a free-text array element
like `uncertainDetails: ["the tag reads "raw silk" on the hem"]` without
escaping the inner quotes, `JSON.parse` treats the first inner `"` as the
string's real end, then chokes on whatever follows. This is a
well-known, common LLM-JSON failure mode, not specific to one model —
and notably, OpenRouter's `response_format: json_schema, strict: true`
(used on attempt 1) did not prevent it, and the fallback `json_object`
mode (used on attempt 2) didn't either, so the fix couldn't rely on
provider-side schema enforcement alone.

**Fixed:** added `repairUnescapedQuotes` in
`packages/providers/src/openrouter.ts` — a single-pass scanner that
tracks string/escape state and re-classifies a `"` encountered mid-string
as an *inner* quote (escaping it) unless the next non-whitespace
character is a real JSON structural delimiter (`,` `}` `]` `:` or end of
input). `extractJson` now tries a bare `JSON.parse` first (unchanged fast
path for well-formed output) and only falls back to the repair pass on a
parse failure; if the repaired text still doesn't parse, the *original*
parse error is re-thrown so genuinely broken output (e.g. real
truncation) still surfaces its real error instead of a misleading one
from the repair attempt.

**Verified with unit tests reproducing the actual failure, not just a
generic case:** added `packages/providers/src/openrouter.extract-json.test.ts`,
7 tests — clean JSON unchanged, markdown-fence stripping still works, an
unescaped quote inside a string **array** element (the literal shape of
the live failure) now repairs and parses correctly, the same for an
unescaped quote inside a plain object string value, already-properly-escaped
quotes are left untouched (repair pass doesn't double-escape or corrupt
valid input), genuinely truncated JSON still throws, and text with no
JSON object at all still throws the original clear error. All 7 pass;
`@shotlin/providers` now 20/20 (was 13/13).

**Full closing verification:** `pnpm -F @shotlin/providers exec tsc
--noEmit` clean; `pnpm build` — all 7 packages/apps pass (rebuilt so the
worker picks up the fix, since `apps/worker` depends on
`@shotlin/providers`'s compiled `dist/`); `pnpm test` at the repo root —
10/10 workspace tasks pass.

**Not done:** the actual failing job (`ce9d24f4-3b12-4874-8182-67e31010d781`)
was left in its `failed` state rather than being force-retried from this
session, since retrying spends real OpenRouter credits — the user should
retry generation themselves now that the fix is built. The raw model
output that triggered the original failure was not recoverable (worker
logs go to the local `pnpm dev` process's stdout, which wasn't captured
to a file this session) — the fix targets the error signature itself
rather than a captured sample, which the new tests exercise directly
against the same class of malformed input.

## 16r. Session Handoff Addendum 17 — 2026-08-23 (Two more real bugs: stale `.next` cache crash + vision role missing the same Qwen hidden-reasoning fix already applied to the QA roles)

**Bug 1 — Next.js dev runtime crash (`Cannot find module './267.js'`):**
user hit this immediately after the 16q fix. Root cause was exactly the
failure mode this project's own log already warned about (see the
"Important warnings" note under the 2026-08-22 handoff, section 16):
`pnpm build` was run earlier in this session (to verify the 16p fix)
*while* `pnpm dev` was still running against the same `apps/web` — this
corrupts Next.js's dev `.next` webpack cache. Confirmed the dev stack was
genuinely still running via `Get-CimInstance Win32_Process` (found the
full `pnpm dev` → `turbo` → per-workspace `next dev -p 3100` /
`tsc --watch` / `concurrently` process tree, ~20 processes). **Fixed** by
killing the entire process tree (`taskkill /PID <root> /T /F`), deleting
`apps/web/.next`, and restarting `pnpm dev` clean (this time with its
output redirected to a log file in the session scratchpad, so future
worker/API/web output is actually inspectable — it wasn't captured
anywhere for the 16q investigation, which cost real diagnostic time).
**Live-verified:** confirmed via the actual browser (`/jobs/[id]`,
`/generate`) that the page renders normally post-restart — no module
error, only a benign favicon 404 — and confirmed all watch compilers
(`core`, `platform`, `database`, `providers`, `worker`'s tsc, `api`'s tsc)
came back up with 0 errors.

**Bug 2 — vision step still failing after the 16q fix, but with a
*different* error:** the next real job the user ran
(`2b60f4bb-d514-4d9c-8071-41bca922333d`) got past `input_check` again but
failed at `vision` with a new message: `"No JSON object found in model
output"` — not the unescaped-quote signature 16q fixed, but `extractJson`'s
other failure branch: the model's response contained no `{`/`}` at all.
With `dev`'s output now actually captured to a log, confirmed via the
worker's own structured log line that both of `openRouterChatJson`'s two
attempts took a full real API round trip (~63s total) and both still
produced unparseable output — this wasn't a network/timeout issue, the
model was genuinely returning something with no JSON in it.

**Root cause, found by pattern-matching against an existing comment in
the same file:** `reviewCandidate` and `secondReview`
(`packages/providers/src/resolver.ts`) already carry an explicit comment
and fix for this exact model: *"Qwen can spend the entire response budget
in hidden thinking when strict-schema mode is combined with two images"*
— both set `strictSchema: false, disableReasoning: true` because of it.
`analyzeGarment` (the vision role) was never given the same treatment —
it still uses the default strict-schema mode with reasoning left enabled.
Confirmed via direct DB query that all three roles
(`vision_analyzer`/`quality_reviewer`/`second_reviewer`) are configured
to the identical model, `qwen/qwen3.8-27b` — and vision attaches *more*
images than the QA calls this was originally fixed for (every garment
reference photo, not just 2), making it at least as exposed to the same
failure: the model burns its entire `maxTokens` budget (1,800) on hidden
reasoning tokens, leaving zero tokens for the actual visible JSON answer
— which is exactly what "no JSON object found" looks like from the
caller's side.

**Fixed:** added the same two settings, `strictSchema: false` and
`disableReasoning: true`, to `analyzeGarment`'s `openRouterChatJson` call
in `resolver.ts`, with a comment cross-referencing the original fix so a
future reader doesn't have to rediscover the connection.

**Verified:** `@shotlin/providers` recompiled clean under the running
`tsc --watch` (0 errors), the worker auto-restarted and picked up the new
compiled code (confirmed via its own "listening" log line with a fresh
timestamp), `pnpm -F @shotlin/providers exec tsc --noEmit` clean, and the
existing 20/20 provider unit tests still pass (this fix is a parameter
change to a live network call, not new pure logic, so it isn't covered by
a new unit test — the existing schema/accounting tests aren't affected by
it and continue to pass unchanged).

**Not done:** neither the stale `Cannot find module` job's underlying job
nor `2b60f4bb-d514-4d9c-8071-41bca922333d` was retried from this session
(same reasoning as 16q — retries cost real credits, left for the user).
`pnpm dev`'s output is now captured to
`<scratchpad>/dev.log` for the remainder of this session — worth
preserving that pattern in future sessions, since its absence during 16q
meant the actual raw model response for *that* failure was lost and had
to be diagnosed from the error message alone.

## 16s. Session Handoff Addendum 18 — 2026-08-23 (Real bug: Gemini opaque generation refusal killing the whole job; added automatic fallback to a different image model)

**Trigger:** the very next real job after 16r's fix
(`163d6572-d01d-48d4-95f8-347ec5f09922`) got past `vision` cleanly and
failed one step later, at `image_generate`:
`OpenRouter image HTTP 400: {"error":{"message":"Gemini could not generate
an image (IMAGE_OTHER)","code":400,"metadata":{"provider_name":"Google AI
Studio","finish_reason":"IMAGE_OTHER","candidate_count":1,"block_reason":null}}}`.

**Diagnosis, from real job data, not guesswork:** this job uses Nano
Banana Pro (`google/gemini-3-pro-image`) with a customer-uploaded
character photo (`jobs.characterAssetId` set — the customer's own face
reference, not a catalog character) to generate a photorealistic person in
a lehenga whose truth sheet literally reads *"V-neckline on the choli...
fitted, cropped midriff-length top."* `IMAGE_OTHER` with `block_reason:
null` is Gemini's generic catch-all refusal — not a specific,
actionable content-policy code — but the combination of a real identity
reference photo with a revealing garment on a photorealistic full-body
render is a known soft trigger for Gemini's image models to silently
decline. This is not a parameter bug: the request was accepted (HTTP 400
with a structured Gemini-side refusal body, not an OpenRouter validation
rejection), the model itself just didn't produce an image.

**Decision (asked the user rather than assumed):** presented four options
— auto-fallback to another model, just retry the same model, switch the
default model away from Nano Banana Pro, or do nothing. User chose
**auto-fallback to another model**.

**What was built:**
1. `getFallbackImageModel(db, excludeModelId)`
   (`apps/worker/src/db.ts`) — the oldest *other* enabled
   `image_generator` model (deterministic, not random, so a job retried
   twice picks the same fallback both times). Confirmed 4 enabled
   image_generator rows exist (Seedream 4.5, Gemini 3.1 Flash Image,
   GPT-5.4 Image 2, Gemini 3 Pro Image), so a real fallback is always
   available today.
2. `isGenerationRefusal(err)` (`apps/worker/src/nodes.ts`) — a narrow
   classifier matching only the opaque-refusal signature (`IMAGE_OTHER`,
   `block_reason`, an explicit `SAFETY`/`PROHIBITED_CONTENT`/`IMAGE_SAFETY`
   finish reason, or "could not generate an image"). Deliberately narrow:
   a capability rejection, auth failure, timeout, or rate limit would fail
   identically on any model, so those are *not* retried against a
   fallback — that would just double the spend on a request that was
   always going to fail.
3. `runImageGenerate`'s `generateAngle` (same file) now tries the
   configured model first and, only on a classified refusal, resolves the
   fallback (cached per attempt, looked up at most once) and retries the
   *same angle* against it once. Refactored `chargeUsage` and the
   generation call to take the model actually used as a parameter (was
   hard-wired to the outer configured model) so a fallback-generated
   candidate is billed to the model that actually produced it, not the one
   that refused — cost accounting stays correct either way. Logs the
   fallback event with both model IDs and the refusal reason. Scoped to
   `runImageGenerate` (the anchor + fan-out path, where a refusal kills
   the *whole* job) — deliberately not extended to `retryFailedAngle`'s
   single-angle retry, since that path already fails safe (marks the
   retry plan `"exhausted"` and finalizes with the angles that did pass,
   never crashes the job), so the value of adding fallback there is much
   lower for meaningfully more surface area.

**Verified:** `pnpm -F @shotlin/worker exec tsc --noEmit` and
`pnpm -F @shotlin/providers exec tsc --noEmit` both clean; existing 20/20
provider tests unaffected (this change is worker-side orchestration, not
provider-side, so it isn't covered by the provider package's test suite —
worker has no test files at all currently, consistent with this session's
existing note that everything in `apps/worker` is verified live/manually
rather than via unit tests). Not live-tested against a real refusal yet
(would require reproducing the same Gemini refusal on demand, which isn't
controllable) — the next real job that hits this failure mode will be the
first live proof; asked the user to retry generation to give it a chance
to fire.

**Incident, unrelated to the fix above but worth recording prominently:**
hit the exact same stale-`.next`-cache crash from 16r **a second time**
this session, by making the exact mistake the log already warned about —
ran `pnpm build` again (to verify the fallback-model typecheck) while
`pnpm dev` was still running in the background. This time it was *more*
dangerous than the first occurrence: `apps/web`'s build was a cache hit
(so its `.next` wasn't touched, by luck), but `@shotlin/worker` and
`@shotlin/providers` both had `tsc` one-shot builds racing against their
own live `tsc --watch` processes writing to the same `dist/` output —
this still corrupted the running dev server (`Cannot find module
'./289.js'`, same failure class as 16r, different chunk number). Fixed
the same way: killed the full process tree, cleared
`apps/web/.next`, restarted `pnpm dev` clean, confirmed via a real browser
screenshot (not just log tailing) that `/generate` renders correctly
post-restart. **Recorded to persistent memory this time** (not just this
log) — `pnpm -F <package> exec tsc --noEmit` is now the standing rule for
verifying a package compiles while `pnpm dev` is live in this repo;
`pnpm build` is reserved for when dev is stopped.

---

## 16. Session Handoff — 2026-08-22 (Master Directive Phase 0 audit + Phase 1 start)

**What was done:**
- Multi-angle generation (1–5 images): anchor-generated-first then parallel fan-out, camera angle vocabulary in `packages/core/src/camera-angles.ts`, `outputCount`/`cameraAngles` on jobs, `sequence`/`camera_angle`/`is_anchor` on candidates and outputs.
- **P0-1 safety fix (critical):** the review pipeline (`quality_review`/`second_review`/`rule_engine`/`finalize` in `apps/worker/src/nodes.ts`) only ever evaluated the last-pushed candidate; every other candidate in a multi-angle set was delivered to the customer **without ever being reviewed**. Fixed: every candidate is now reviewed, per-candidate decisions roll up via `rollUpSetDecision`/`selectDeliverableCandidates` (`packages/core/src/candidate-set.ts`, 11 unit tests), and `finalize` only delivers explicit `PASS` decisions.
- Security: `SESSION_SECRET` production-boot check added (`packages/platform/src/config.ts` — refuses to start with a known/placeholder/short secret when `NODE_ENV=production`); session cookie `secure` flag is now environment-aware instead of hardcoded `false` (`apps/api/src/auth/auth.module.ts`).
- Budget hard-stop now scales per requested image count instead of a flat ₹20 regardless of `outputCount`.
- Character upload wiring fix, home-page/job-result thumbnail gallery fixes (were showing stale/placeholder images).
- Full Phase 0 audit against the SHOTLIN Master Executive Build Directive — see `docs/REMAINING_MVP_EXECUTION_PLAN.md` for the complete phased plan and honest gap list.

**What currently works:** full pipeline including multi-angle end-to-end, confirmed with a real paid 4-angle job. All 59 unit tests pass (`pnpm -F @shotlin/core test`). `pnpm build` passes for all 7 packages/apps.

**What is partially implemented:** per-candidate QA exists but per-angle *retry* does not yet — a failed non-anchor angle is withheld, not automatically regenerated. Anchor QA does not yet gate whether fan-out angles are generated at all (all angles currently generate unconditionally in one step, before any review happens) — this is the next highest-value fix per the execution plan.

**What is broken:** nothing known in application code. **Infra:** this machine is severely memory-constrained (7.4GB total RAM, observed as low as 0.1–1.2GB free) — Docker Desktop's backend has failed to start within its normal window multiple times this session and the whole dev-server/Docker stack has needed manual recovery after apparent session/environment restarts at least three times. The 0003 migration (`decision`/`decision_reasons` columns) was generated and typechecked but **could not be applied this session** because Docker was down at the time — apply it before doing anything else next session: `pnpm -F @shotlin/database db:migrate`.

**What should be done next (in order):**
1. Verify Docker is up, apply migration `0003_ambiguous_nico_minoru.sql`, run `pnpm build`, restart `pnpm dev`, re-verify a real multi-angle job end-to-end.
2. Gate fan-out generation on anchor QA passing (Phase 3 in the execution plan) — currently the highest-value remaining cost/correctness fix.
3. Cost ledger as source of truth (`SUM(cost_events)` instead of cached `jobs.totalCostInr`) + persistent structured `RetryPlan` + per-angle retry (Phase 1).
4. See `docs/REMAINING_MVP_EXECUTION_PLAN.md` for the full phase list — do not re-audit the repo from scratch, that document is current as of this session.

**Important warnings for the next agent:**
- Never run `pnpm build` while `pnpm dev` is running against the same apps — this corrupts the Next.js dev `.next` cache (happened this session, required `rm -rf apps/web/.next` + full dev-server restart to recover). Stop dev first, build, then restart dev.
- This machine runs low on RAM under the full stack (Docker + `pnpm dev`'s 4 tsc watchers + Next.js). If pages start 500ing or Docker becomes unreachable, check `Get-CimInstance Win32_OperatingSystem | select FreePhysicalMemory` before assuming an application bug.
- `.env` holds local secrets and must never be committed. `MOCK_PROVIDERS=false` and a real `OPENROUTER_API_KEY` are currently set for live-provider testing — real money is spent on every non-mock generation.
- `SESSION_SECRET` in production must be a real random 32+ char value or the app now correctly refuses to boot — do not "fix" that check by weakening it.

## 17. Current Runtime Configuration (last verified 2026-08-21, before this session's Docker outage — re-verify against `model_registry` once DB is reachable)

- Vision analyzer: `qwen/qwen3.8-27b` via OpenRouter (per prior session note; not re-queried this session)
- Image generator: `bytedance-seed/seedream-4.5` via OpenRouter images endpoint (set this session, confirmed working via a real paid job)
- Primary/second QA reviewer models: not re-verified this session — check `model_registry` table for current `quality_reviewer`/`second_reviewer` rows
- `MOCK_PROVIDERS=false` (live mode, real OpenRouter credits)
- Budget: `hardStopInr` from `budget_rules` × requested image count (changed this session; was flat ₹20 regardless of count)
- Latest migration: `0003_ambiguous_nico_minoru.sql` (generated + typechecked this session; **not yet applied** — see handoff above)

---

## 18. Session Handoff — 2026-09-24 (Production Fashion Studio frontend: motion, mobile-first nav, accessibility, honest controls)

**Context for the next agent:** sections 1–17 were written on a different machine (`/Users/sayan/Documents/IMG GEN`, macOS). This session ran on `C:\Users\MSI\image_gen` (Windows), and git history here (`d712369` production DB seed → RLS → Railway/Vercel deployment prep) postdates the log's last entry. Where this log's "current state" claims conflict with the working tree or `git log`, trust the files.

**What was done (customer web only, `apps/web`):**
- Added `motion` (the Framer Motion successor — import from `motion/react`, not `framer-motion`) and a minimal `cn()` helper at `src/lib/cn.ts`. GSAP deliberately skipped: Motion covers the animation needs and GSAP is a poor trade under React 19.
- Adopted shadcn/ui *principles* without installing the Radix stack (no theme infra exists, and the component aesthetic would violate the editorial design brief): semantic tokens in `:root` (`--surface`, `--text`, `--accent`, `--ring`, etc.), global `:focus-visible` rings, `color-scheme: light`.
- `app-shell.tsx` rewrite: role-separated nav (Control room link only renders for `role === "admin"` from `/api/auth/me` — previously leaked to all users), real profile block (initials/name/role) or a Sign-in link, dead help/bell header buttons removed, Motion page fade on route change (disabled under reduced motion), and a mobile bottom tab bar (Studio/Projects/Account, 48px targets, `env(safe-area-inset-bottom)`), with the sidebar hidden below 760px.
- New `camera-capture.tsx`: getUserMedia rear-camera overlay (framing guide, capture/retake, Escape to close, permission-denied fallback to file input), wired into the garment dropzone as "Capture with camera".
- `generator.tsx` rewrite: step tabs are now functional (IntersectionObserver scroll-spy + `scrollIntoView`), AUTO/PRO progressive disclosure (PRO-only: image model select, camera-angle picker, detail-kind selects; switching to AUTO clears model/angle picks so AUTO honestly means "pipeline decides"), real localStorage draft persistence (`shotlin:studio-draft:v1`) with an honest "Draft saved · HH:MM" indicator (the old "autosaved just now" was a static lie), shared `uploadFile()` helper, and catalog fetch effects no longer clobber restored draft selections (functional `current ?? data[0]?.id` update).
- Accessibility pass: `:focus-visible` outlines everywhere, all Motion animations skip under `prefers-reduced-motion`, smooth scrolling only under `no-preference`, `role="tablist"`/`aria-selected` on steps, `aria-pressed` on the mode toggle.
- Icons: added `camera`, `user`, `swap` to `icon.tsx`.

**Verification:** `pnpm -F shotlin-web check` (tsc --noEmit) and `pnpm -F shotlin-web build` both pass (9/9 routes, ~156 kB first load on `/`). **Not browser-verified this session** — the machine had 0.45 GB free RAM (documented constraint above), so the dev stack was left down. Smoke-test with `pnpm dev` when the machine has headroom: step-tab scroll-spy, AUTO/PRO toggle, draft restore across reload, camera overlay (needs API up for uploads; permission flow works offline), bottom nav under 760px.

**Warnings (unchanged, still binding):**
- Never `pnpm build` while `pnpm dev` runs against the same apps — stale-`.next` corruption has happened twice in this repo's history.
- No push/deploy/live AI credits without explicit authorization; mock provider remains the default for automated verification.

---

## 19. Session Handoff — 2026-09-24 (Master plan P7/P8 data foundation: garment taxonomy + AI garment profiles + API)

**Scope:** First executable slice of the 16-phase Production Fashion AI Studio plan. Phases 7 (AI garment understanding) and 8 (extensible taxonomy) needed a data foundation before any customer-facing garment intelligence UI can exist without dead controls.

**Audit finding (why this slice):** CODEBASE_LOG §16's old "next steps" (anchor QA gating, per-angle retry, infra-retry classification) are already implemented in `apps/worker/src/nodes.ts` (`gateOnAnchorReview`, `retryFailedAngle`, `isRetryableInfraError`) — that list is stale. Remaining plan work is tracked against the 16-phase checklist, not §16.

### Schema (`packages/database/src/schema.ts`, migration `drizzle/0011_sparkling_epoch.sql`)
- `garment_taxonomy`: hierarchical (self-ref `parent_id`, cascade), `category` enum women|men|kids|unisex, unique `slug`, `aliases text[]`, `compatibility` jsonb, `is_active`, `sort_order`. Footwear intentionally absent by product scope.
- `garment_profiles`: one row per (owner, content fingerprint `sha256(checksum:sizeBytes)`) → re-analyzing the same upload returns the cached profile. Stores `detection` jsonb (the existing `GarmentTruthSheet` contract), per-field `confidence` (0..1, nullable), `confirmed_attributes` jsonb (user corrections), `status` auto_detected|confirmed|corrected, `taxonomy_node_id`, `taxonomy_version` for reproducibility as the taxonomy evolves.
- Migration generated but **NOT yet applied** — Postgres (docker compose) was down this session. Run `pnpm db:migrate && pnpm db:seed` when the stack is up.

### Seed (`packages/database/src/taxonomy-seed.ts`, wired idempotently into `seed.ts`)
- ~110 taxonomy nodes: women (saree + 10 regional sub-types, lehenga, salwar kameez, anarkali, kurti, pavadai/half-saree, mekhela chador, pheran, chaniya choli, blouse/choli, dupatta, gowns, dresses, western bottoms/tops/outerwear, swimwear, nightwear), men (kurta, kurta-pajama, sherwani/achkan, nehru/modi jacket, bandhgala, pathani, dhoti, lungi, mundu, angarkha + full western line), kids (girls frock/lehenga/pattu pavadai, boys kurta-pajama/sherwani/dhoti set, rompers, unisex). Indian/traditional families carry `compatibility.regionalStyle` and `drapeSupport` for Phase 11. Aliases on major nodes.

### API (`apps/api/src/garments/garments.module.ts`, registered in `app.module.ts`)
- Customer (`/garments`, AuthGuard): `GET /taxonomy/tree` (nested active nodes), `GET /profiles` (own profiles), `POST /analyze` { assetId } — IDOR-safe asset load (owner or admin), usable+garment_reference checks, fingerprint cache hit returns `{ cached: true }`, else runs `resolveProviders().analyzeGarment` with the enabled `vision_analyzer` registry model and persists the profile (MOCK_PROVIDERS respected — no live spend by default), maps truth-sheet `garmentType` → taxonomy slug best-effort; `PATCH /profiles/:id` — confirm/correct with ownership check and taxonomy node validation.
- Admin (`/admin/garment-taxonomy`, AdminGuard): POST / PUT( partial ) / DELETE (cascades children).

**Honest gaps (not claimed complete):** detection fields are the existing 16-field GarmentTruthSheet, not the plan's ~26; the "We detected this as…" editable UI (P7 frontend) is not built; taxonomy is not yet surfaced in the generator UI; migration/seed not applied to a live DB.

**Verification:** `tsc --noEmit` green on database, api, core, providers, worker, web. `pnpm -r --workspace-concurrency=1 test` green (core 83, providers 20; api/worker have no test files yet). **New:** on this low-RAM box (203–305 MB free) `tsc` native-crashed until run with `NODE_OPTIONS=--max-old-space-size=700` — prefix memory-heavy builds/checks accordingly.

**Warnings (unchanged, still binding):**
- Never `pnpm build` (Next.js) while `pnpm dev` runs; dev stack stayed down all session.
- No push/deploy/live AI credits without explicit authorization; mock provider is the default.
- Admin accounts must not be publicly creatable; do not weaken RLS/session security.

### Addendum §19.1 — P7 customer UI (same session)
- `apps/web/src/components/garment-intel.tsx` (new): "We detected this as **{type}**" card with confidence chip, status chip (AI detected / confirmed / corrected), human-readable chips (colour · fabric · pattern · neckline · sleeves · silhouette · drape · embroidery), and an honest "unsure about: …" list from `uncertainDetails`. PRO mode reveals editable fields (type select, taxonomy category select fed by `/api/garments/taxonomy/tree` optgroups, free-text fabric/pattern/border/embroidery/neckline/sleeves/silhouette) and Confirm-vs-Save-corrections (PATCH status `confirmed` vs `corrected`). AUTO mode shows the summary and a note that Pro unlocks corrections — no dead inputs.
- `generator.tsx`: upload success triggers `POST /api/garments/analyze` (non-blocking; silent when signed out, message-only on other failures); new uploads reset the profile; card rendered under the detail-references block inside the Garment step.
- `globals.css`: `.garment-intel*` styles on semantic tokens (`--surface-raised`, `--border`, `--ring`, …), `:focus-visible` rings, reduced-motion respected via the global rule.
- Verified: `tsc --noEmit` green for web. Not browser-tested (dev stack down; RAM constraint).

---

## 20. Session Handoff — 2026-09-24 (Master plan P5: real customer account, password change, first-run tour, working sign-out)

**Audit finding:** `/settings` was admin-only provider config, yet the sidebar/mobile nav labelled it "Account" — customers clicking "Account" landed on "Admin access required". Also: `POST /api/auth/logout` existed server-side but **nothing in the UI ever called it** — there was no way to sign out.

### Schema — migration `drizzle/0012_fantastic_blacklash.sql` (generated, NOT applied: Postgres down this session)
- `users.organization_name` text nullable, `users.preferences` jsonb default `{}`, `users.onboarded_at` timestamptz nullable.

### API — new `apps/api/src/account/account.module.ts` (registered in `app.module.ts`)
- `GET /account` → profile + `garmentProfileCount` + live `activeSessions` count.
- `PATCH /account` → name, organizationName, preferences (Zod-enumerated `defaultResolution` 1k|2k|4k, `defaultAspectRatio` portrait|square|landscape, `defaultOutputCount` 1..5; merged, not replaced).
- `POST /account/onboarding` `{action: complete|skip}` → sets `onboardedAt` (tour is skippable by design).
- `POST /account/password` → verifies current password with `verifyPassword`, rehashes, and **revokes every other session** while keeping the caller's cookie valid (compares `hashSessionToken(req.cookies["shotlin_session"])` against `user_sessions.token_hash`).
- `SessionUser` is now defined once in `apps/api/src/types.ts` (was duplicated in `common.ts`) and carries `onboardedAt`; `AuthGuard` selects and attaches it, so `/api/auth/me` exposes it.

### Web
- New `/account` page: studio identity (name, business name, read-only email), studio defaults, session/garment/member-since stats, change-password form with client-side match/length guards, and a Sign-out control (mobile users have no rail).
- `app-shell.tsx`: "Account" now routes to `/account` for everyone; "Settings" (provider config) is shown only to admins; real Sign-out button wired to `POST /api/auth/logout` + redirect.
- First-run tour: `OnboardingTour` renders above the studio only for a signed-in user with `onboardedAt === null`, three anchored steps (#studio-garment / #studio-character / #studio-output), Skip + Finish both persist via the API; if the write fails the tour stays rather than silently disappearing.
- `generator.tsx`: on a fresh visit (no local draft) it loads `/api/account` and applies the server defaults to resolution/frame/set-size; an existing draft wins because it encodes more specific intent.
- Deliberately dropped: a "brand watermark" preference had no consumer in the prompt path, so it was removed instead of shipping a dead control.

**Verification:** `tsc --noEmit` green for database, api, web; workspace tests green (core 83, providers 20). Not browser-verified (dev stack down, RAM constraint). Pending when the stack is next up: `pnpm db:migrate && pnpm db:seed` to apply 0011 + 0012 and load the taxonomy.

**Warnings (unchanged, still binding):**
- Never `pnpm build` (Next.js) while `pnpm dev` runs; prefix memory-heavy tsc/drizzle commands with `NODE_OPTIONS=--max-old-space-size=700` on this box.
- No push/deploy/live AI credits without explicit authorization; mock provider stays the default.
- Admin accounts must not be publicly creatable (`register` hardcodes `role: "customer"` — unchanged and still true).

---

## 21. Session Handoff — 2026-09-24 (Master plan P9 + P10: model system, age vocabulary, under-18 safety policy)

### New domain module — `packages/core/src/model-appearance.ts` (92 core tests pass, 9 of them new)
- `AGE_GROUPS`: nine canonical bands toddler / child / preteen / teen / young-adult / adult / middle-aged / senior / elder, each with a stated age range and an `isMinor` flag.
- `AGE_APPEARANCE_VALUES` keeps the legacy strings (`mid-20s`, `late-teens`, `mid-40s`, `mature`, …) **valid** — historical jobs stay reproducible and seeded catalogue rows keep rendering; `ageGroupFor()` maps legacy → canonical group.
- `evaluateChildSafety()` is the single deterministic policy: blocked pose / scene / styling token lists, normalised for case/separator, returning `violations`, human-readable `substitutions`, and `requiresGuardianConfirmation`.

### Phase 10 enforcement (two nets, both server-side)
- **API (`jobs.module`)**: `ageAppearance` is now a Zod enum over `AGE_APPEARANCE_VALUES` (was any string ≤60). Custom (`origin_kind = 'custom'`) models with an under-18 appearance are **rejected without a guardian record** before any spend. Environment presets are screened against `MINOR_BLOCKED_SCENES` with an actionable message. The decision is stored in the job snapshot (`selections.under18Policy`) so a historical job shows which policy governed it.
- **Worker (`nodes.ts` prompt_compile)**: after the truth sheet exists, the same evaluator runs over the *garment's own* neckline / sleeves / silhouette / drape / special details — the only place those facts exist — and substitutes `MINOR_DEFAULT_POSE` for a blocked pose plus appends a `CHILD-SAFE DIRECTION:` line. AI execution still never runs in the web request path.

### Phase 9 model system
- Migration `drizzle/0013_omniscient_newton_destine.sql` (generated, NOT applied): `characters.origin_kind` enum preset|synthetic|custom (default preset), `consent_confirmed_at`, `consent_statement_version`, `guardian_confirmed_at`.
- New `apps/api/src/models/model-library.module.ts` at `/customer/models`: `GET /` browse (studio + own), `GET /appearance-options` (age vocabulary + `CONSENT_STATEMENT_VERSION = "2026-09-01"` — bumping it invalidates old acknowledgements deliberately), `POST /` create with **required** right-to-use confirmation and a required guardian confirmation when the age band is a minor, `DELETE /:id` limited to the caller's own non-preset models (IDOR).
- New `/models` page: filter by gender / age band / origin, model cards with facts, consent state shown for own models, add-model form where the guardian checkbox only appears for under-18 bands, and legacy catalogue strings still resolve to a filter bucket.
- `generator.tsx`: age control now renders the nine API-supplied groups (with a pre-load fallback and preservation of an existing draft's value) and states plainly that under-18 appearances follow the styling policy.
- `app-shell.tsx`: Models added to desktop and mobile navigation (P2 IA: Studio / Projects / Models / Account).

**Verification:** `tsc --noEmit` green for database, core, providers, api, worker (web green too). Tests: core 92 passed, providers 20 passed. Not browser-verified; migrations 0011–0013 all still pending application (`pnpm db:migrate && pnpm db:seed` when the stack is next up).

**Honest gaps:** synthetic-model *generation* (creating an identity from scratch) is not implemented — `origin_kind = 'synthetic'` exists and is settable at creation, but there is no generator flow behind it yet; model previews are still the single `previewAssetId`/identity-pack mechanism from before; the taxonomy/garment library UI (P15) is untouched.

**Warnings (unchanged, still binding):** no `pnpm build` while dev runs; `NODE_OPTIONS=--max-old-space-size=700` for tsc/drizzle on this box; no push/deploy/live credits; mock provider default; admins not publicly creatable; under-18 policy is server-side and must not be loosened from the client.

---

## 22. Session Handoff — 2026-09-24 (Master plan P11: drape / dupatta / regional wear intelligence)

- Migration `drizzle/0014_daffy_cardiac.sql` (generated, NOT applied): `wear_styles` — `kind` enum saree_drape|dupatta_placement|regional_look|layering, unique slug, `taxonomy_slugs text[]` (which garments it suits), `region`, `compatibility` jsonb, `prompt_fragment`, `drape_steps` jsonb, `is_active`, `sort_order`, `created_by`.
- `packages/database/src/wear-seed.ts`: 14 saree drapes (Nivi, Bengali Atpoure, Gujarati Shaicha, Nauvari, Madisar, Kerala Munduputtavum, Odia Sambalpuri, Parsi Gara, Goan Kunbi, Lehenga-style, Dhoti-pant, Seedha pallu, Retro falling, Tribal) + 12 dupatta placements + 4 regional/layering looks, each with a written prompt fragment and plain-language step list. Idempotent by slug (refreshes copy, preserves admin-added rows). Wired into `seed.ts`.
- API (`garments.module`): `GET /garments/wear-styles?for=<taxonomy slug or node id>` — node ids are resolved to slugs so the studio can use what it already has; when nothing is registered for a node it falls back to generic placements rather than showing an empty picker. Admin CRUD at `/admin/wear-styles` (Zod-validated, records `created_by`).
- Job path: `wearStyleId` on the create request; the API resolves it and **copies the prompt fragment into `selections.wearStyle`**, so a later library edit cannot rewrite what an old job asked for. Worker emits `WEAR / DRAPE (<name>): <fragment>` in the compiled brief.
- Studio: "How it is worn" chips appear in the Scene step, matched to the recognised garment (regional label shown), with the drape step sequence rendered as `step → step → step`; the pick is drafted to localStorage, cleared automatically when the garment changes, and named in the review summary line.
- Verification: all six packages `tsc --noEmit` OK; tests core 92 / providers 20 pass. Not browser-verified; migrations 0011–0014 still pending (`pnpm db:migrate && pnpm db:seed`).

---

## 23. Session Handoff — 2026-09-24 (Master plan P13: scenes, poses, crop, real aspect ratios)

**New shared vocabulary — `packages/core/src/output-vocabulary.ts` (96 core tests pass, 4 new):**
- `ASPECT_RATIOS`: six options — 3:4, 2:3, 1:1, 9:16, 4:3, 16:9 — each carrying the ratio **actually sent to the image model**. The legacy ids (`portrait`/`square`/`landscape`) remain in the list resolving to the ratios they always meant, so historical jobs re-run identically.
- `POSES`: thirteen cards, each with plain-language note + prompt fragment; `adultOnly` marks hip-pop and looking-back.
- `FRAMINGS`: seven crops from full-body to macro detail.
- New test asserts **the `adultOnly` pose cards and `MINOR_BLOCKED_POSES` are the same set** — the UI promise and the server policy cannot drift. (Caught a real gap: `over-shoulder` was added to the blocklist.)

**One source of truth, three consumers:**
- `packages/providers/src/openrouter.ts`: deleted its private `{portrait: "3:4", …}` map and now calls `aspectRatioParam()`. Previously a stored `portrait-916` would have silently fallen back to 3:4.
- `apps/api`: `aspectRatio`, `pose` and the new `framing` validate against the core lists (they were inline `z.enum` literals); `framing` is stored in `selections`; the under-18 screen now evaluates pose as well as scene.
- `apps/worker`: emits `POSE:` from the pose fragment, adds `FRAMING:`, and prints the real ratio in `ASPECT RATIO:` (e.g. `ASPECT RATIO: 9:16 (portrait-916)`).
- `GET /customer/options` serves the vocabulary so the studio renders what the API validates.

**Studio (`generator.tsx`):**
- Frame select lists all six ratios with their use (marketplace grids, reels, campaign banner). Old localStorage drafts holding display labels ("Portrait") are normalised to ids on load — a stored value can never become an invalid submission.
- PRO mode adds 13 pose chips and 7 crop chips with tooltips; AUTO clears both (same "decide for me" honesty as angles/model) and the age-blocked pose warns inline instead of letting the request bounce.
- Review summary now names the frame with its ratio.

**Scene library:** `seed.ts` grows from 7 to 17 presets (rooftop golden hour, heritage haveli, temple courtyard, handloom atelier, marigold courtyard, garden lawn, monsoon verandah, art-deco interior, desert fort, boutique rail) — none of which collide with the under-18 scene blocklist.

**Verification:** all seven workspace packages `tsc --noEmit` OK; core 96 + providers 20 tests pass (the provider tests still pin the exact `aspect_ratio` payload). Still pending: browser check, and migrations 0011–0014 have not been applied to a live DB (`pnpm db:migrate && pnpm db:seed`).

**Honest gaps in P13:** quality *modes* (Draft→Maximum) are not implemented — the plan lists them and the UI has no such control; the 6 ratios are exposed only through `outputCount`/camera-angle machinery that still caps at `MAX_ANGLES`.

---

## 24. Session Handoff — 2026-09-24 (Master plan P14: structured feedback, per-angle regeneration, admin feedback analytics)

**Migration `drizzle/0015_goofy_lucky_pierre.sql`** (generated, NOT applied): `feedback.reasons text[]`, `jobs.parent_job_id uuid` → FK to `jobs.id` on delete set null.
> Caution learned the hard way: a bulk `pgTable` edit anchored on `id: uuid("id")…userId: uuid("user_id")` silently landed on **user_sessions** first (drizzle-kit happily generated a nonsensical FK there). The bad `0015_unknown_amphibian.sql` was deleted, its `_journal.json` entry and snapshot rolled back, and the column re-placed with the `export const jobs = pgTable("jobs",` header as anchor. **Always grep the generated SQL for the target table name before accepting a migration.**

**Seven structured reasons — `packages/core/src/feedback.ts`** (99 core tests, 3 new; one asserts exactly 7 unique ids and that each maps to a pipeline stage): `colour_off`, `detail_lost`, `fabric_wrong`, `drape_wrong`, `identity_changed`, `pose_framing`, `background_lighting`, each with an `owner` (vision / prompt / generation / identity / scene). `summarizeFeedbackReasons()` rolls counts up to the owning stage.

**Result page (`/jobs/[id]`)**
- "Needs improvement" now expands into the seven checkboxes plus a comment, and sends `{rating, reasons, comment}` in one request; "Good result" still sends immediately (reasons empty).
- New **Try again** card on any delivered result: *Regenerate the {angle} angle* for the currently viewed image, and *Redo the whole set* when the job had several angles. Copy states plainly that a regeneration is a new job and never overwrites the current result.

**API**
- `POST /jobs/:id/regenerate` `{cameraAngle?}` — rebuilds the original request from `job_inputs` + the stored `selections` snapshot (garment, details with kinds, character, environment, model, resolution, ratio, pose, framing, wear style) and pushes it through the **normal `createJob` path**, so validation, budget guard and queueing are unchanged; the child is then linked with `parentJobId`. Rejects while the parent is still running and rejects an angle that was not part of the set. Route is behind the same `GenerationRateLimitGuard` as creation.
- The `selections.wearStyle` snapshot now carries the style `id` as well as the fragment, so a regeneration keeps the same drape.
- Feedback upsert stores and updates `reasons` (deduplicated).
- `GET /admin/feedback/analytics` (AdminGuard) → totals, by rating, by reason (labelled, with owner), rolled-up by owner, last 20 records.

**Admin control room**: new "Result feedback" tab (`FeedbackPanel`) rendering the analytics — reasons ranked, each annotated with the pipeline stage it routes to, plus the recent comment table.

**Verification:** all seven packages `tsc --noEmit` OK; core 99 + providers 20 tests pass. Not browser-verified (dev stack down). P14 items still open: swipe-gesture navigation on the filmstrip (currently tap-to-select thumbnails) and a "reuse this output as a reference" flow, which needs an asset-import path from job outputs.

**Warnings (unchanged, still binding):** no `pnpm build` while `pnpm dev` runs; use `NODE_OPTIONS=--max-old-space-size=700`; no push/deploy/live credits; mock provider default; migrations 0011–0015 all still need `pnpm db:migrate && pnpm db:seed`.

---

## 25. Session Handoff — 2026-09-24 (Master plan P15: garment library, presets, brand look-books, batch)

- Migration `drizzle/0016_amused_khan.sql`: `garment_profiles.title` + `is_favorite`; new `studio_presets` (owner, `kind` generation|brand, name, `payload` jsonb, notes, `is_default`).
- `apps/api/src/presets/presets.module.ts`: `/presets` CRUD with a **strict, whitelisted payload** (only job-request fields that the pipeline actually reads — a preset cannot carry a setting nothing consumes); setting one default clears the others for that kind. `/garments/library` returns each saved profile with a signed preview and its taxonomy name; `PATCH` rename/favourite; `DELETE` owner-scoped.
- `POST /jobs/batch` (`jobs.module`): one garment + up to 8 variants (`environment/pose/framing/wearStyle/outputCount` each) is expanded into normal `createJob` calls, so budget, validation, idempotency and the queue behave identically to a single generation. Reports `started / requested / failures` instead of pretending a partial run succeeded.
- Web: `/garments` library (name, favourite, remove, **Shoot this garment** hands the asset to the studio via a one-shot `localStorage` key the generator consumes and deletes); `/presets` (brand look-book builder: approved scenes + default model, plus a table of generation/brand presets with default/delete); `/batch` (garment picker → shared settings → variant rows → per-look result links and honest failure lines); studio header gains a `PresetBar` (apply / save-current, inline naming) whose apply maps back onto the real studio state; nav gains Garments / Batch / Presets.
- `NODE_OPTIONS=--max-old-space-size=700` remains required for every tsc/drizzle invocation on this box.

---

## 26. Session Handoff — 2026-09-24 (First LIVE end-to-end verification: migrations applied, API + worker booted, three real bugs fixed)

**Why this mattered:** everything up to §25 had only ever been checked by `tsc` and unit tests. The stack was finally brought up, and it found bugs typechecking cannot see.

**Environment found (and respected):** `lndry_postgres` owns host port **5434** and a foreign MinIO answers on **9000/::1:9000**, so `docker compose up` for this project cannot bind its own Postgres, and presigned uploads fail with `InvalidAccessKeyId`. I did **not** touch the other projects' containers. Instead I ran a throwaway `shotlin-pg-verify` container on port 5499 mounted on the project's own `shotlin_pgdata` volume, then removed it and left every container in its original state (shotlin-postgres/redis/minio all Exited again).
**To run the stack locally, free 5434 and 9000 (or change the compose host ports) first.**

**Migrations 0011–0016 applied for real; seed verified in SQL:**
`164` taxonomy nodes (90 roots), `30` wear styles (14 saree drapes + 12 dupatta placements + 4 regional/layering), `17` environment presets, `6` characters, and **38 of 38 public tables have RLS enabled** (the migrate.ts sweep covers the new tables automatically).

**Bug 1 — invalid migration (caught on first `db:migrate`).** `wear_styles.drape_steps` was a `jsonb` column defaulting to `ARRAY[]::text[]`, which Postgres rejects; drizzle-kit had emitted it into **0014** and the whole run rolled back. Fixed the schema default to `'[]'::jsonb`, hand-corrected the already-generated `0014_*.sql` and both snapshots, rolled the journal back and regenerated. A fresh `db:migrate` then applied cleanly. **Lesson: generated SQL is not evidence it runs — apply it to a database.**

**Bug 2 — duplicate route kills the API at boot.** `@Controller("/customer/models")` (model library) collided with the existing `GET /customer/models` (image-generation models): `FST_ERR_DUPLICATED_ROUTE`, process exits — invisible to `tsc`. Moved the library to `/customer/model-library` and consolidated every vocabulary (age groups, aspect ratios, poses, framings) into one `GET /customer/options`; the stale duplicate route was removed rather than left behind.

**Bug 3 — unique violations returned HTTP 500.** `POST /admin/garment-taxonomy` and `/admin/wear-styles` on a duplicate slug produced `{"statusCode":500}`. Added `apps/api/src/unique-violation.ts` and wrapped the writes in `ConflictException`. The **first attempt did not work**: Drizzle re-throws as `DrizzleQueryError` with the pg error under `.cause`, so a top-level `error.code` check never matched — the live retest still showed 500 until the helper walked the `cause` chain (bounded at depth 6 to survive a self-referential cause). Verified live: duplicate → `409 "A taxonomy node with that slug already exists"`, same for wear styles.
- Also made `POST /garments/analyze` concurrency-safe: two simultaneous analyses of identical bytes hit the unique `(owner, fingerprint)` index, so the insert is now `onConflictDoNothing` and the loser re-selects and returns the winner's profile as `cached: true`.
- The API gained its first real unit tests (`unique-violation.test.ts`, 4 passing).

**Live endpoint battery (mock providers, no credits spent).** Verified against a running API: health reports postgres/redis/storage; register/login/me (now carrying `onboardedAt`); `/customer/options`; taxonomy tree (90 roots); wear styles `?for=womens-saree` → 14; presets create/rename/list/default; brand preset; **model consent gates**: create without consent → 400, under-18 without guardian → 400 `An under-18 model needs a guardian or rights-holder confirmation…`, with guardian → 201; IDOR delete of a foreign model → 404. Job creation: adult control → 201; **`teen` + `hip-pop` → 400 `Not used for an under-18 appearance: pose:hip-pop. pose → standing.`**; `teen` + `standing` → 201; unknown aspect ratio → 400 listing the valid enum; batch 2 variants → `started=2/2`; feedback with two reasons → 201 (invalid reason → 400); **customer hitting `/admin/feedback/analytics` → 403**, admin → 200 with `byOwner {vision:1, prompt:1}`; account overview/patch/onboarding-skip; wrong current password → 401, short new password → 400; logout → subsequent `/auth/me` → 401.
**Worker:** boots against the new schema, consumes the queue, and correctly logs `job already terminal, skipping` for a re-delivered job. It then fails at `input_check` with `InvalidAccessKeyId` — the foreign MinIO, not the code. **So the generation → QA → delivery path and my WEAR/DRAPE / FRAMING / CHILD-SAFE prompt lines still have never executed.** That is the single most important thing to verify once object storage is reachable.
- Honest limits found while testing: uploads/`/garments/analyze` happy path could not run for the same storage reason (guard paths returned the right messages: `Uploaded object not found — upload first`, `Upload is not validated yet…`); the generation rate limiter also swallows the *next* request with 429 when a previous one failed validation, which is correct anti-abuse behaviour but makes rapid-fire form retries feel like an error — worth revisiting when P14's retry UX is polished.
- Test rows created during the battery were deleted afterwards; the dev volume now contains exactly what `db:migrate && db:seed` produces (1 admin user, 0 jobs).

---

## 27. Session Handoff — 2026-09-24 (Master plan P16: account control, audit trail, catalogue admin — verified live)

**Migration `drizzle/0017_nostalgic_lenny_balinger.sql`:** `users.disabled_at`. Applied to the dev volume and verified.

### Suspension is a real control, not a flag
- `AuthGuard` now requires `isNull(users.disabledAt)` in the session lookup, so an **existing** cookie stops working the moment an account is suspended; `AuthService.login` additionally rejects with `This account is suspended` instead of pretending the credentials were wrong.
- Suspending revokes every live session immediately (`user_sessions.revoked_at`), so the guard does not have to wait for token expiry.
- Guards on the writes: no self-suspension, no self role change, and a last-active-admin check on demotion/suspension. Accounts are suspended rather than deleted so jobs and costs stay attributable — and `admin_audit_events.user_id` is `ON DELETE SET NULL`, so the trail survives even a real deletion (the panel then shows `—`).

### New admin API (`apps/api/src/admin/admin-users.controllers.ts`)
- `GET /admin/users` — accounts with live `jobCount` and `activeSessions` counts plus `activeAdmins`.
- `POST /admin/users` — the **only** path to an admin account (public sign-up still hardcodes `role: "customer"`); password minimum 16 to match the seed policy.
- `PATCH /admin/users/:id/role`, `POST /admin/users/:id/suspension` — both audited.
- `GET /admin/audit?limit=` — actor name/email/role joined from `adminAuditEvents`, capped 1–200.
- `AdminModule` now exports `AdminService`, and `GarmentsModule` injects it so every taxonomy and wear-style write emits `taxonomy.create|update|delete` / `wear_style.create|update|delete` audit rows. (Deliberate choice: reuse `AdminService.audit` rather than add a second audit abstraction.)

### Control room UI (4 new tabs, 13 total)
`Garment taxonomy` (tree with depth, add node with aliases + parent, deactivate instead of delete), `Drapes & wear` (kind filter, add/remove, shows the stored prompt fragment and step sequence), `Users` (roster, role select, suspend/reinstate, create-account form), `Audit trail` (refreshable event table). All read/write through the admin API — no static mock rows.

### Live verification (again: typechecking cannot see DI or route faults)
API booted with **96 routes mapped, zero errors**; `scripts/verify-p16.mjs` (kept for re-runs; dev-only, uses the seed fallback password) exercised the real behaviour:
`create second admin → 201`; `short password → 400`; `self-suspend → 400`; `self-demote → 400`; `suspend → 201` and the **suspended account's already-issued session → 401 `Session expired or invalid`**; `login while suspended → 401 This account is suspended`; `reinstate → login 201`; `operator sees /admin/users → 200`; `demote → 200` and the ex-admin → **403 Admin access required**; `GET /admin/audit → 5 events` with actor attribution `admin@shotlin.local (admin) taxonomy.create garment_taxonomy`; duplicate slug still → `409`.
Test rows were deleted afterwards; the volume is back to 1 admin user, 164 taxonomy nodes and 0 audit events, and every container was returned to its original state.

**What P16 still needs:** the plan's fuller section list (moderation queue, benchmark runs, model price editing UI, provider health history) and the responsive/E2E pass; `Run inspector` and `Budget & cost` already exist. The generation pipeline itself remains unverified because port 9000 answers with a foreign MinIO (see §26).

**Warnings (unchanged, still binding):** no `pnpm build` while `pnpm dev` runs; `NODE_OPTIONS=--max-old-space-size=700` for tsc/drizzle; no push/deploy/live credits; mock provider default; **admin accounts are creatable only by an existing admin**; suspension/RLS/session controls must not be loosened from the client.

---

## 28. Session Handoff — 2026-09-24 (First true end-to-end generation run: P7+P8+P11+P13+P14+P10 proven through the real pipeline)

**How the storage blocker was worked around (without touching other projects):** port 9000 answers with a *foreign* MinIO, so `shotlin-minio` cannot bind it. I ran the project's own `shotlin_miniodata` volume in a throwaway container on **9010**, created `uploads`/`outputs` with the compose credentials, and started API + worker with `S3_ENDPOINT=http://localhost:9010 MOCK_PROVIDERS=true` alongside the throwaway Postgres on 5499. Both temp containers were removed afterwards, the buckets were emptied, and `shotlin-redis` was returned to its original Exited state.

**New repeatable harness:** `scripts/verify-e2e.mjs` — registers a customer, presigns and PUTs a generated 480×640 PNG, validates it, analyses it, lists the wear styles offered for the detected node, then runs a two-angle adult job and a one-angle teen job. Dev-only (uses the seed fallback admin password), like `scripts/verify-p16.mjs`.

**What actually happened (all of it previously unverified):**
```
register 201 → presign 201 → put object 200 → complete 201 usable {480x640, image/png}
analyze 201 cached=false type=saree conf=0.92 → wear styles offered: 14 (Nivi, Bengali Atpoure, Gujarati Shaicha …)
job 201 → states: ready → result 200 delivery=final images=2 (front, three_quarter_left)
preview GET 200 14.5KB · png download 200 image/png 42.4KB
step runs: input_check → vision → skill_select → prompt_compile → image_generate →
           quality_review → rule_engine → second_review(skipped) → retry(skipped) → finalize  all succeeded
ledger: candidates=2, job_outputs=2, cost_events=12 (mock $0.14323), truth_sheet persisted
```
This is the first time the camera/asset intake → garment recognition → taxonomy match → drape selection → generation → QA → delivery chain has run as a whole.

**Gap found and fixed while verifying the trace:** `prompt_compile` recorded only `promptLength`, `layerSizes`, `truncated` and `budget` — so the control room's long-standing "prompt + truth sheet available per job" claim was **not true**: nothing stored what was actually sent, and my new prompt lines could not be inspected at all. The worker now also records `promptExcerpt` (first 4 000 chars of the assembled brief) plus `promptExcerptComplete`, and the run inspector renders it in an expandable "Compiled brief (N chars)" block. Bounded text of the customer's own selections and garment facts — no image bytes, no provider configuration.

**Assertions read back from the real recorded briefs:**
- adult 2-angle job: `WEAR / DRAPE`=true, `FRAMING`=true, pose fragment (`mid-stride walking`)=true, `ASPECT RATIO: 1:1`=true (the P13 ratio fix survives the provider boundary), `CHILD-SAFE`=false (correct for an adult).
- teen job (`standing`, `full`, finished `ready`): `CHILD-SAFE DIRECTION: the wearer appears under 18 — age-appropriate styling, modest framing and natural posture`=true, `APPEARANCE AGE: teen`=true, `FRAMING`=true, and `selections.under18Policy=true` is stored on the job.
- A third submission was met with `429 Generation is already being submitted…` — the limiter also fires *after* a rejected request, so a user who fixes a validation error cannot retry for a few seconds. Functional, but worth revisiting while polishing P14/P16 UX.

**Cleanup:** all `e2e-*` users and their jobs/assets/profiles/presets/sessions deleted, both buckets emptied (they were empty before the run — verified `mc ls` = 0 objects), dev volume left at 1 seeded admin, 0 jobs, 164 taxonomy nodes.

**Still unverified after this session:** live (non-mock) providers — deliberately unspent; browser/UI rendering of every page built this session; Playwright E2E; the P1 plan-audit artifact; remaining P16 sections (moderation queue, benchmark runs, price editing).

**Warnings (unchanged, still binding):** no `pnpm build` while `pnpm dev` runs; `NODE_OPTIONS=--max-old-space-size=700`; no push/deploy/live AI credits; mock provider default; ports 5434/9000 are held by other projects (see §26 and the memory note).

---

## 29. Session Handoff — 2026-09-24 (First browser verification of the UI + WCAG target-size fix)

**How, with no visible browser surface:** the in-app browser reported `viewport=0x0, visibilityState=hidden`, so pointer clicks and screenshots are refused (`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`); DOM evaluation and accessibility snapshots still work. Since CSS media queries follow the **iframe** viewport, rendering every route inside a sized iframe gives real responsive measurements without a surface. Login was performed with `fetch(..., credentials: "include")` from the page (CORS + `SameSite=lax` cookies across `localhost` ports behave as same-site).

**Production build served for real:** `pnpm -F shotlin-web build` (dev stack was down, per the standing rule) → 13 routes, first-load JS 151–167 kB. Then `node next start -p 3100`.

**Rendered and measured, first time ever:**
- `/` studio: nav = Studio · Projects · Garments · Batch · Models · Presets · Account (P2 IA), 5 step tabs, Auto/Pro `aria-pressed`, first-run tour with 3 steps (P5), preset bar (P15), wear picker (P11), **age select rendering 10 options = 9 canonical groups + the draft's preserved legacy `mid-20s`** (P9/P10), **frame select 6 ratios with their use text** (P13), breadcrumb status `stack online`.
- `/garments` (1 seeded saree card, 4 actions), `/models` (7 panels = 6 catalogue characters + filter row, 3 filter selects), `/presets` (3 panels, 18 inputs = the 17 approved-scene checkboxes + name), `/batch` (3 panels, 9 selects), `/account` (2 panels, 6 inputs, 4 buttons) — all render with live API data, **zero console messages** throughout.
- `/admin` as a **customer** → "Operator access required" screen (UI role separation on top of the server 403). As **admin** → 13 tabs including the four new ones, and each new panel loads real data: taxonomy **164 rows**, drapes **30 rows**, users **2 rows**, audit 0 (events were cleaned).

**Real defect found and fixed — touch targets.** Measuring visible interactive elements per viewport showed **43 controls below 44 px at 360 px (smallest 29 px)**: the §18 "accessibility pass" claim about target size had never been measured and was wrong. Added a `@media (max-width: 900px), (pointer: coarse)` block raising `.button`, step tabs, mode toggle, angle/wear chips, nav links, selects and inputs to `min-height: 44px` (plus 44 px `.icon-button`), keeping the 24 px floor for fine-pointer desktop. **After the fix: 360 px and 768 px → 0 elements under 44 px, smallest exactly 44; 1024/1920 → 0 under 24 px** (WCAG 2.2 AA 2.5.8 on desktop), no horizontal overflow at any width 360→1920.

**Second trap worth remembering:** `pnpm -F shotlin-web start` spawns `next` as a **child of pnpm**; stopping the tracked background task killed only the wrapper, leaving an orphan holding 3100 and serving the *previous* build — my rebuilt CSS silently never reached the browser (`min-height: auto`, CSS hash `24d801ee…` on disk vs `29fdad9f…` expected). Detect it by comparing the served stylesheet hash with `apps/web/.next/static/css/`, or check `netstat -ano | grep :3100`. Start the server directly (`node ./node_modules/next/dist/bin/next start -p 3100`) to keep it killable as one process.

**Cleanup:** UI test user + assets/profile/sessions deleted, both buckets emptied, throwaway Postgres/MinIO containers removed, `shotlin-redis` returned to Exited, ports 3100/4000 confirmed free. Dev volume state: 1 seeded admin, 164 taxonomy nodes, 30 wear styles, 0 jobs.

**Still not verified:** actual pixels (needs a visible browser surface or Playwright — neither available here), swipe gestures on the result filmstrip, camera capture against a live device, and live (non-mock) providers.
