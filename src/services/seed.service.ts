import { ALL_PERMISSIONS, type PermissionCode } from "../constants/permissions.js";
import { Business } from "../models/Business.js";
import { Role } from "../models/Role.js";
import { Location } from "../models/inventory.js";
import type { Types } from "mongoose";
import { seedSuggestedProductMetadataFields } from "./productMetadata.service.js";

const DEFAULT_ROLES: { name: string; permissions: PermissionCode[] }[] = [
  { name: "Owner", permissions: ALL_PERMISSIONS },
  { name: "Manager", permissions: ALL_PERMISSIONS },
  {
    name: "Cashier",
    permissions: [
      "sales.read",
      "sales.pos.access",
      "sales.pos.checkout",
      "customers.read",
      "customers.create",
      "appointments.read",
    ],
  },
  {
    name: "InventoryClerk",
    permissions: [
      "inventory.read",
      "inventory.create",
      "inventory.update",
      "inventory.transfer.create",
      "purchases.read",
      "purchases.create",
      "purchases.receive",
    ],
  },
  {
    name: "Stylist",
    permissions: [
      "appointments.read",
      "appointments.create",
      "appointments.update",
      "customers.read",
    ],
  },
  {
    name: "Accountant",
    permissions: [
      "reports.sales.read",
      "reports.inventory.read",
      "reports.employee.read",
      "reports.financial.read",
    ],
  },
  {
    name: "ReadOnly",
    permissions: [
      "employees.read",
      "inventory.read",
      "sales.read",
      "customers.read",
      "reports.sales.read",
    ],
  },
];

export async function seedBusinessDefaults(businessId: Types.ObjectId): Promise<Types.ObjectId> {
  for (const roleDef of DEFAULT_ROLES) {
    await Role.findOneAndUpdate(
      { businessId, name: roleDef.name },
      {
        businessId,
        name: roleDef.name,
        permissions: roleDef.permissions,
        isSystem: true,
      },
      { upsert: true, new: true },
    );
  }

  const defaultLocation = await Location.findOne({ businessId, isDefault: true });
  if (!defaultLocation) {
    await Location.create({
      businessId,
      name: "Main",
      isDefault: true,
    });
  }

  await seedSuggestedProductMetadataFields(businessId);

  const ownerRole = await Role.findOne({ businessId, name: "Owner" });
  if (!ownerRole) {
    throw new Error("Owner role missing after seed");
  }
  return ownerRole._id;
}

export async function getSingletonBusiness() {
  return Business.findOne().sort({ createdAt: 1 });
}
