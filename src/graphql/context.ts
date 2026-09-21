import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { PermissionCode } from "../constants/permissions.js";
import { verifyAccessToken } from "../auth/jwt.js";
import { Business } from "../models/Business.js";
import { Employee } from "../models/Employee.js";
import { Session } from "../models/Session.js";
import type { IUser } from "../models/User.js";
import { User } from "../models/User.js";
import { resolvePermissions } from "../services/access.service.js";
import { migrateBusinessToMinorStorage } from "../services/moneyMigration.service.js";
import type { IEmployee } from "../models/Employee.js";
import type { IBusiness } from "../models/Business.js";

export type GraphQLContext = {
  req: Request;
  res: Response;
  user: IUser | null;
  employee: IEmployee | null;
  business: IBusiness | null;
  businessId: Types.ObjectId | null;
  permissions: Set<PermissionCode>;
  sessionId: string | null;
};

const emptyAccess = {
  permissions: new Set<PermissionCode>(),
};

export async function buildSessionContext(
  authHeader: string | undefined,
): Promise<Omit<GraphQLContext, "req" | "res">> {
  const base = {
    user: null,
    employee: null,
    business: null,
    businessId: null,
    sessionId: null,
    ...emptyAccess,
  };

  if (!authHeader?.startsWith("Bearer ")) return base;

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const session = await Session.findById(payload.sessionId);
    if (!session || session.revokedAt) return base;

    const user = await User.findById(payload.sub);
    if (!user) return base;

    let business = await Business.findById(user.businessId);
    if (!business) return base;

    if (business.monetaryStorageMinor === false) {
      await migrateBusinessToMinorStorage(business._id);
      business = await Business.findById(user.businessId);
      if (!business) return base;
    } else if (business.monetaryStorageMinor == null) {
      business.monetaryStorageMinor = true;
      await business.save();
    }

    let employee: IEmployee | null = null;
    if (session.activeEmployeeId) {
      employee = await Employee.findOne({
        _id: session.activeEmployeeId,
        businessId: business._id,
        isActive: true,
      });
    }
    if (!employee) {
      employee = await Employee.findOne({ businessId: business._id, userId: user._id });
    }
    const permissions = employee
      ? await resolvePermissions(business._id, employee.roleIds)
      : new Set<PermissionCode>();

    session.lastSeenAt = new Date();
    void session.save();

    return {
      user,
      employee,
      business,
      businessId: business._id,
      permissions,
      sessionId: session._id.toString(),
    };
  } catch {
    return base;
  }
}

export async function buildContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  const session = await buildSessionContext(req.headers.authorization);
  return { req, res, ...session };
}
