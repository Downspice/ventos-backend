import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { Business } from "../models/Business.js";
import { Employee } from "../models/Employee.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { signAccessToken, type JwtPayload } from "../auth/jwt.js";
import { env } from "../config/env.js";
import { badRequest, unauthorized } from "../errors/appError.js";
import { seedBusinessDefaults } from "./seed.service.js";
import { writeAuditLog } from "./audit.service.js";
import { createSessionForUser } from "./session.service.js";

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export async function registerBusiness(input: {
  businessName: string;
  email: string;
  password: string;
  name: string;
  deviceLabel?: string;
  ipAddress?: string;
}) {
  const existingBusiness = await Business.findOne();
  if (existingBusiness) {
    badRequest("Business already registered for this deployment");
  }

  const slugBase = slugify(input.businessName) || "business";
  const business = await Business.create({
    name: input.businessName,
    slug: slugBase,
    email: input.email,
    currency: "GHS",
    monetaryStorageMinor: true,
  });

  const ownerRoleId = await seedBusinessDefaults(business._id);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    businessId: business._id,
    email: input.email,
    name: input.name,
    passwordHash,
  });

  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  await Employee.create({
    businessId: business._id,
    userId: user._id,
    firstName: firstName || "Owner",
    lastName: rest.join(" ") || "User",
    email: input.email,
    roleIds: [ownerRoleId],
    isActive: true,
  });

  const { tokens } = await createSessionForUser(user, input.deviceLabel);

  await writeAuditLog({
    businessId: business._id,
    userId: user._id,
    ipAddress: input.ipAddress,
    action: "auth.register",
    entityType: "Business",
    entityId: business._id.toString(),
  });

  return { business, user, ...tokens };
}

export async function login(input: {
  email: string;
  password: string;
  deviceLabel?: string;
  ipAddress?: string;
}) {
  const business = await Business.findOne();
  if (!business) badRequest("No business registered");

  const user = await User.findOne({ businessId: business._id, email: input.email.toLowerCase() });
  if (!user?.passwordHash) unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) unauthorized("Invalid credentials");

  const { tokens } = await createSessionForUser(user, input.deviceLabel);

  await writeAuditLog({
    businessId: business._id,
    userId: user._id,
    ipAddress: input.ipAddress,
    action: "auth.login",
    entityType: "User",
    entityId: user._id.toString(),
  });

  return { business, user, ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken);
  const session = await Session.findOne({ refreshTokenHash: hash, revokedAt: { $exists: false } });
  if (!session) unauthorized("Invalid refresh token");

  session.lastSeenAt = new Date();
  await session.save();

  const user = await User.findById(session.userId);
  if (!user) unauthorized();

  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    businessId: session.businessId.toString(),
    sessionId: session._id.toString(),
  };

  return {
    accessToken: signAccessToken(payload),
    expiresIn: env.jwtExpiresIn,
  };
}

export async function logout(sessionId: string, userId: string) {
  await Session.findOneAndUpdate(
    { _id: sessionId, userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
  return true;
}

export async function revokeSession(sessionId: string, businessId: import("mongoose").Types.ObjectId) {
  await Session.findOneAndUpdate({ _id: sessionId, businessId }, { revokedAt: new Date() });
  return true;
}

export async function listSessions(businessId: import("mongoose").Types.ObjectId, userId: string) {
  return Session.find({
    businessId,
    userId,
    revokedAt: { $exists: false },
  }).sort({ lastSeenAt: -1 });
}
