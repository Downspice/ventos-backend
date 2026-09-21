import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Business } from "../models/Business.js";
import { Employee } from "../models/Employee.js";
import { Role } from "../models/Role.js";
import { User } from "../models/User.js";
import { registerBusiness } from "../services/auth.service.js";
import { seedBusinessDefaults } from "../services/seed.service.js";
import { defaultAvatarUrlForSeed } from "../services/avatarPresets.service.js";

const DEV_BUSINESS_NAME = "Ventos Demo";

const DEV_USERS = [
  {
    email: "joseph.awer+admin@gmial.com",
    password: "Pineapple1!",
    name: "Joseph Admin",
    firstName: "Joseph",
    lastName: "Admin",
    roleName: "Owner" as const,
  },
  {
    email: "joseph.awer+webapp@gmial.com",
    password: "Pineapple1!",
    name: "Joseph Web",
    firstName: "Joseph",
    lastName: "Webapp",
    roleName: "Manager" as const,
  },
] as const;

async function upsertUserWithEmployee(
  businessId: mongoose.Types.ObjectId,
  roleId: mongoose.Types.ObjectId,
  spec: (typeof DEV_USERS)[number],
): Promise<void> {
  const email = spec.email.toLowerCase();
  const passwordHash = await bcrypt.hash(spec.password, 12);

  let user = await User.findOne({ businessId, email });
  const avatarUrl = defaultAvatarUrlForSeed(email);

  if (user) {
    user.name = spec.name;
    user.passwordHash = passwordHash;
    if (!user.avatarUrl?.trim()) user.avatarUrl = avatarUrl;
    await user.save();
  } else {
    user = await User.create({
      businessId,
      email,
      name: spec.name,
      passwordHash,
      avatarUrl,
    });
  }

  const employee = await Employee.findOne({ businessId, userId: user._id });
  if (employee) {
    employee.firstName = spec.firstName;
    employee.lastName = spec.lastName;
    employee.email = email;
    employee.roleIds = [roleId];
    employee.isActive = true;
    if (!employee.avatarUrl?.trim()) employee.avatarUrl = user.avatarUrl ?? avatarUrl;
    await employee.save();
  } else {
    await Employee.create({
      businessId,
      userId: user._id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email,
      roleIds: [roleId],
      isActive: true,
      avatarUrl: user.avatarUrl ?? avatarUrl,
    });
  }

  console.log(`Seeded ${spec.roleName} user: ${email}`);
}

async function main(): Promise<void> {
  await connectDatabase();

  let business = await Business.findOne().sort({ createdAt: 1 });
  if (!business) {
    const admin = DEV_USERS[0];
    await registerBusiness({
      businessName: DEV_BUSINESS_NAME,
      email: admin.email,
      password: admin.password,
      name: admin.name,
      deviceLabel: "seed-dev-users",
    });
    business = await Business.findOne();
    if (!business) {
      throw new Error("Business missing after registerBusiness");
    }
    console.log(`Created business: ${business.name}`);

    const webSpec = DEV_USERS[1];
    await seedBusinessDefaults(business._id);
    const managerRole = await Role.findOne({ businessId: business._id, name: webSpec.roleName });
    if (!managerRole) {
      throw new Error(`${webSpec.roleName} role missing after seed`);
    }
    await upsertUserWithEmployee(business._id, managerRole._id, webSpec);
    return;
  }

  await seedBusinessDefaults(business._id);

  for (const spec of DEV_USERS) {
    const role = await Role.findOne({ businessId: business._id, name: spec.roleName });
    if (!role) {
      throw new Error(`Role not found: ${spec.roleName}`);
    }
    await upsertUserWithEmployee(business._id, role._id, spec);
  }

  console.log(`Using existing business: ${business.name}`);
}

main()
  .then(async () => {
    await disconnectDatabase();
  })
  .catch(async (error) => {
    console.error(error);
    await disconnectDatabase();
    process.exit(1);
  });
