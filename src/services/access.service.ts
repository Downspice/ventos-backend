import type { PermissionCode } from "../constants/permissions.js";
import { Role } from "../models/Role.js";
import type { Types } from "mongoose";

export async function resolvePermissions(
  businessId: Types.ObjectId,
  roleIds: Types.ObjectId[],
): Promise<Set<PermissionCode>> {
  if (roleIds.length === 0) return new Set();
  const roles = await Role.find({ businessId, _id: { $in: roleIds } });
  const set = new Set<PermissionCode>();
  for (const role of roles) {
    for (const code of role.permissions) {
      set.add(code as PermissionCode);
    }
  }
  return set;
}
