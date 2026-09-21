import type { IBusiness } from "../models/Business.js";
import type { IEmployee } from "../models/Employee.js";
import type { IRole } from "../models/Role.js";
import type { IUser } from "../models/User.js";
import type { ISession } from "../models/Session.js";
import type { IAuditLog } from "../models/AuditLog.js";

export const mapId = (doc: { _id: { toString(): string } }) => doc._id.toString();

export function mapUser(user: IUser) {
  return {
    id: mapId(user),
    email: user.email,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    businessId: user.businessId.toString(),
    createdAt: user.createdAt.toISOString(),
  };
}

export function mapBusiness(b: IBusiness) {
  return {
    id: mapId(b),
    name: b.name,
    slug: b.slug,
    email: b.email ?? null,
    phone: b.phone ?? null,
    address: b.address ?? null,
    logoUrl: b.logoUrl ?? null,
    currency: b.currency ?? "GHS",
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function mapEmployee(e: IEmployee) {
  return {
    id: mapId(e),
    businessId: e.businessId.toString(),
    userId: e.userId?.toString() ?? null,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email ?? null,
    phone: e.phone ?? null,
    avatarUrl: e.avatarUrl ?? null,
    roleIds: e.roleIds.map((id) => id.toString()),
    isActive: e.isActive,
    hasPosPin: Boolean(e.posPinHash),
    createdAt: e.createdAt.toISOString(),
  };
}

export function mapRole(r: IRole) {
  return {
    id: mapId(r),
    businessId: r.businessId.toString(),
    name: r.name,
    description: r.description ?? null,
    permissions: r.permissions,
    isSystem: r.isSystem,
    createdAt: r.createdAt.toISOString(),
  };
}

export function mapSession(s: ISession) {
  return {
    id: mapId(s),
    deviceLabel: s.deviceLabel ?? null,
    lastSeenAt: s.lastSeenAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}

export function mapAuditLog(a: IAuditLog) {
  return {
    id: mapId(a),
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId ?? null,
    ipAddress: a.ipAddress ?? null,
    metadata: a.metadata ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export function mapDoc(doc: { _id: { toString(): string }; createdAt?: Date; updatedAt?: Date }) {
  const base = {
    id: doc._id.toString(),
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
  return base;
}
