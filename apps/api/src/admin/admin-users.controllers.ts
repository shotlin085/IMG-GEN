import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  adminAuditEvents,
  jobs,
  userSessions,
  users,
} from "@shotlin/database";
import { hashPassword } from "@shotlin/platform";
import { z } from "zod";
import { AdminGuard, parseWith } from "../common";
import type { AuthedRequest } from "../types";
import { DB, type ApiDb } from "../infrastructure";
import { AdminService } from "./admin.service";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(16).max(200),
  role: z.enum(["customer", "admin"]).default("customer"),
  organizationName: z.string().trim().max(160).optional(),
});

/** Number of admins that can still reach the control room. */
async function activeAdminIds(db: ApiDb) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.disabledAt)));
}

@Controller("/admin/users")
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(
    @Inject(DB) private db: ApiDb,
    private admin: AdminService,
  ) {}

  @Get()
  async list() {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        organizationName: users.organizationName,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const jobCounts = await this.db
      .select({ userId: jobs.userId, n: sql<string>`count(*)` })
      .from(jobs)
      .groupBy(jobs.userId);
    const sessionCounts = await this.db
      .select({ userId: userSessions.userId, n: sql<string>`count(*)` })
      .from(userSessions)
      .where(and(isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date())))
      .groupBy(userSessions.userId);

    const jobsByUser = new Map(jobCounts.map((row) => [row.userId, Number(row.n)]));
    const sessionsByUser = new Map(sessionCounts.map((row) => [row.userId, Number(row.n)]));

    return {
      users: rows.map((row) => ({
        ...row,
        jobCount: jobsByUser.get(row.id) ?? 0,
        activeSessions: sessionsByUser.get(row.id) ?? 0,
      })),
      activeAdmins: rows.filter((row) => row.role === "admin" && !row.disabledAt).length,
    };
  }

  /**
   * Roles only change here — public registration always creates a customer.
   * The two guards stop an admin locking the control room to nobody.
   */
  @Patch("/:id/role")
  async setRole(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    const input = parseWith(z.object({ role: z.enum(["customer", "admin"]) }), body);
    if (id === req.user!.id) throw new BadRequestException("You cannot change your own role");
    const target = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (target.length === 0) throw new NotFoundException("User not found");
    if (target[0].role === "admin" && input.role === "customer") {
      const remaining = await activeAdminIds(this.db);
      if (remaining.length <= 1) {
        throw new BadRequestException("This is the last active admin; promote another account first");
      }
    }
    const updated = await this.db
      .update(users)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    await this.admin.audit(req.user!.id, "user.role.update", "user", id, { role: input.role });
    return updated[0];
  }

  @Post("/:id/suspension")
  async setSuspension(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    const input = parseWith(z.object({ disabled: z.boolean() }), body);
    if (input.disabled && id === req.user!.id) {
      throw new BadRequestException("You cannot suspend your own account");
    }
    const target = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (target.length === 0) throw new NotFoundException("User not found");
    if (input.disabled && target[0].role === "admin" && target[0].disabledAt === null) {
      const remaining = await activeAdminIds(this.db);
      if (remaining.length <= 1) {
        throw new BadRequestException("This is the last active admin; promote another account first");
      }
    }
    await this.db
      .update(users)
      .set({ disabledAt: input.disabled ? new Date() : null, updatedAt: new Date() })
      .where(eq(users.id, id));
    if (input.disabled) {
      // Suspension has to bite now, not whenever the token happens to expire.
      await this.db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, id), isNull(userSessions.revokedAt)));
    }
    await this.admin.audit(
      req.user!.id,
      input.disabled ? "user.suspend" : "user.reinstate",
      "user",
      id,
      {},
    );
    return { ok: true, disabled: input.disabled };
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body() body: unknown) {
    const input = parseWith(createUserSchema, body);
    const email = input.email.toLowerCase();
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) throw new ConflictException("Email already registered");
    const inserted = await this.db
      .insert(users)
      .values({
        email,
        name: input.name,
        role: input.role,
        organizationName: input.organizationName ?? null,
        passwordHash: hashPassword(input.password),
      })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    await this.admin.audit(req.user!.id, "user.create", "user", inserted[0].id, {
      email,
      role: input.role,
    });
    return inserted[0];
  }
}

@Controller("/admin/audit")
@UseGuards(AdminGuard)
export class AdminAuditController {
  constructor(@Inject(DB) private db: ApiDb) {}

  @Get()
  async list(@Query("limit") limit?: string) {
    const parsed = Number.parseInt(limit ?? "50", 10);
    const take = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 200) : 50;
    const rows = await this.db
      .select({
        id: adminAuditEvents.id,
        action: adminAuditEvents.action,
        entityType: adminAuditEvents.entityType,
        entityId: adminAuditEvents.entityId,
        payload: adminAuditEvents.payload,
        createdAt: adminAuditEvents.createdAt,
        actorName: users.name,
        actorEmail: users.email,
        actorRole: users.role,
      })
      .from(adminAuditEvents)
      .leftJoin(users, eq(users.id, adminAuditEvents.userId))
      .orderBy(desc(adminAuditEvents.createdAt))
      .limit(take);
    return { events: rows };
  }
}
