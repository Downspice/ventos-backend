import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { Employee } from "../models/Employee.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { badRequest, unauthorized } from "../errors/appError.js";
import { resolvePermissions } from "./access.service.js";
import { writeAuditLog } from "./audit.service.js";
import { mapEmployee } from "../graphql/mappers.js";
import { notDeletedFilter } from "../models/shared/documentLifecycle.js";

export async function listPosEmployeeRoster(businessId: Types.ObjectId) {
  const rows = await Employee.find({
    ...notDeletedFilter({ businessId }),
    isActive: true,
  }).sort({ firstName: 1, lastName: 1 });

  return rows.map((e) => ({
    id: e._id.toString(),
    firstName: e.firstName,
    lastName: e.lastName,
    avatarUrl: e.avatarUrl ?? null,
    canSignInWithPassword: Boolean(e.userId),
    canSignInWithPin: Boolean(e.posPinHash),
  }));
}

export async function activatePosEmployee(input: {
  businessId: Types.ObjectId;
  sessionId: string;
  employeeId: string;
  password: string;
  userId: Types.ObjectId;
  ipAddress?: string;
}) {
  const session = await Session.findOne({
    _id: input.sessionId,
    businessId: input.businessId,
    userId: input.userId,
    revokedAt: { $exists: false },
  });
  if (!session) unauthorized("Session not found");

  const employee = await Employee.findOne({
    ...notDeletedFilter({ _id: input.employeeId, businessId: input.businessId }),
    isActive: true,
  });
  if (!employee) badRequest("Employee not found");

  let verified = false;

  if (employee.userId) {
    const user = await User.findById(employee.userId);
    if (user?.passwordHash) {
      verified = await bcrypt.compare(input.password, user.passwordHash);
    }
  }

  if (!verified && employee.posPinHash) {
    verified = await bcrypt.compare(input.password, employee.posPinHash);
  }

  if (!verified) unauthorized("Invalid password or PIN");

  session.activeEmployeeId = employee._id;
  session.lastSeenAt = new Date();
  await session.save();

  const permissions = await resolvePermissions(input.businessId, employee.roleIds);

  await writeAuditLog({
    businessId: input.businessId,
    userId: input.userId,
    employeeId: employee._id,
    ipAddress: input.ipAddress,
    action: "pos.employee.activate",
    entityType: "Employee",
    entityId: employee._id.toString(),
  });

  return {
    activeEmployee: mapEmployee(employee),
    permissions: [...permissions],
  };
}

export async function deactivatePosEmployee(input: {
  businessId: Types.ObjectId;
  sessionId: string;
  userId: Types.ObjectId;
  ipAddress?: string;
}) {
  const session = await Session.findOne({
    _id: input.sessionId,
    businessId: input.businessId,
    userId: input.userId,
    revokedAt: { $exists: false },
  });
  if (!session) unauthorized("Session not found");

  const previousId = session.activeEmployeeId?.toString();
  session.activeEmployeeId = undefined;
  await session.save();

  if (previousId) {
    await writeAuditLog({
      businessId: input.businessId,
      userId: input.userId,
      ipAddress: input.ipAddress,
      action: "pos.employee.deactivate",
      entityType: "Employee",
      entityId: previousId,
    });
  }

  return true;
}

export async function hashPosPin(pin: string): Promise<string> {
  const trimmed = pin.trim();
  if (trimmed.length < 4 || trimmed.length > 32) {
    badRequest("POS PIN must be 4–32 characters");
  }
  return bcrypt.hash(trimmed, 12);
}
