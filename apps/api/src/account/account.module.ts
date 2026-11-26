import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { and, count, eq, ne, isNull, gt } from "drizzle-orm";
import { garmentProfiles, userSessions, users } from "@shotlin/database";
import { hashPassword, verifyPassword } from "@shotlin/platform";
import { z } from "zod";
import { AuthGuard, hashSessionToken, parseWith, type SessionUser } from "../common";
import { AuthModule } from "../auth/auth.module";
import { DB, type ApiDb } from "../infrastructure";
import type { AuthedRequest } from "../types";

// Must match the session cookie name the AuthGuard reads (see common.ts).
const SESSION_COOKIE = "shotlin_session";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  organizationName: z.string().trim().max(160).nullable().optional(),
  preferences: z
    .object({
      defaultResolution: z.enum(["1k", "2k", "4k"]).optional(),
      defaultAspectRatio: z.enum(["portrait", "square", "landscape"]).optional(),
      defaultOutputCount: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});

const onboardingSchema = z.object({ action: z.enum(["complete", "skip"]) });

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
});

@Injectable()
class AccountService {
  constructor(@Inject(DB) private db: ApiDb) {}

  async overview(user: SessionUser) {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        organizationName: users.organizationName,
        preferences: users.preferences,
        onboardedAt: users.onboardedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const profile = rows[0];
    const [profiled] = await this.db
      .select({ value: count() })
      .from(garmentProfiles)
      .where(eq(garmentProfiles.ownerId, user.id));
    const [sessions] = await this.db
      .select({ value: count() })
      .from(userSessions)
      .where(and(eq(userSessions.userId, user.id), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date())));
    return { ...profile, garmentProfileCount: profiled?.value ?? 0, activeSessions: sessions?.value ?? 0 };
  }

  async updateProfile(user: SessionUser, body: unknown) {
    const input = parseWith(profileSchema, body);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.organizationName !== undefined) patch.organizationName = input.organizationName;
    if (input.preferences !== undefined) {
      const existing = await this.db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      patch.preferences = { ...(existing[0]?.preferences ?? {}), ...input.preferences };
    }
    const updated = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        organizationName: users.organizationName,
        preferences: users.preferences,
        onboardedAt: users.onboardedAt,
      });
    return updated[0];
  }

  /** Both paths set onboardedAt — the tour is skippable by design, never forced. */
  async markOnboarded(user: SessionUser) {
    return this.db
      .update(users)
      .set({ onboardedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({ onboardedAt: users.onboardedAt });
  }

  async changePassword(user: SessionUser, body: unknown, req: AuthedRequest) {
    const input = parseWith(passwordSchema, body);
    const rows = await this.db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const account = rows[0];
    if (!account || !verifyPassword(input.currentPassword, account.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    await this.db
      .update(users)
      .set({ passwordHash: hashPassword(input.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    // Every other device must sign in again; this request's session survives.
    const currentHash = hashSessionToken(req.cookies?.[SESSION_COOKIE] ?? "");
    await this.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.userId, user.id), ne(userSessions.tokenHash, currentHash)));
    return { ok: true, otherSessionsRevoked: true };
  }
}

@Controller("/account")
@UseGuards(AuthGuard)
class AccountController {
  constructor(private service: AccountService) {}

  @Get()
  overview(@Req() req: AuthedRequest) {
    return this.service.overview(req.user!);
  }

  @Patch()
  update(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.updateProfile(req.user!, body);
  }

  @Post("/onboarding")
  async onboard(@Req() req: AuthedRequest, @Body() body: unknown) {
    parseWith(onboardingSchema, body);
    await this.service.markOnboarded(req.user!);
    return { ok: true };
  }

  @Post("/password")
  password(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.service.changePassword(req.user!, body, req);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
