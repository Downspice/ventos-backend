import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";
import { defaultAvatarUrlForSeed } from "../services/avatarPresets.service.js";

/**
 * Assigns a preset avatar to every user and employee that does not have one yet.
 * Same email/id always maps to the same preset (stable across runs).
 */
async function main(): Promise<void> {
  await connectDatabase();

  let usersUpdated = 0;
  const users = await User.find({ $or: [{ avatarUrl: { $exists: false } }, { avatarUrl: null }, { avatarUrl: "" }] });
  for (const user of users) {
    user.avatarUrl = defaultAvatarUrlForSeed(user.email);
    await user.save();
    usersUpdated++;
    console.log(`User ${user.email} → ${user.avatarUrl}`);
  }

  let employeesUpdated = 0;
  const employees = await Employee.find({
    $or: [{ avatarUrl: { $exists: false } }, { avatarUrl: null }, { avatarUrl: "" }],
  });
  for (const employee of employees) {
    const user = employee.userId ? await User.findById(employee.userId) : null;
    if (user?.avatarUrl?.trim()) {
      employee.avatarUrl = user.avatarUrl;
    } else {
      const seed = employee.email ?? user?.email ?? employee._id.toString();
      employee.avatarUrl = defaultAvatarUrlForSeed(seed);
    }
    await employee.save();
    employeesUpdated++;
    console.log(`Employee ${employee.firstName} ${employee.lastName} → ${employee.avatarUrl}`);
  }

  let syncedFromUser = 0;
  const linked = await Employee.find({ userId: { $exists: true, $ne: null } });
  for (const employee of linked) {
    const user = await User.findById(employee.userId);
    if (!user?.avatarUrl?.trim()) continue;
    if (employee.avatarUrl === user.avatarUrl) continue;
    employee.avatarUrl = user.avatarUrl;
    await employee.save();
    syncedFromUser++;
    console.log(`Synced employee ${employee.firstName} ${employee.lastName} → ${employee.avatarUrl}`);
  }

  console.log(
    `Done. Users: ${usersUpdated}, employees: ${employeesUpdated}, synced from linked user: ${syncedFromUser}.`,
  );
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
