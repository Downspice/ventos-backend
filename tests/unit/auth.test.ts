import { describe, expect, it, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { registerBusiness, login } from "../../src/services/auth.service.js";
import { Business } from "../../src/models/Business.js";
import { Role } from "../../src/models/Role.js";

describe("auth and RBAC seed", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("registers business, owner employee, and system roles", async () => {
    const result = await registerBusiness({
      businessName: "Test Salon",
      email: "owner@test.com",
      password: "password12345",
      name: "Owner User",
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    const business = await Business.findOne();
    expect(business?.name).toBe("Test Salon");

    const roles = await Role.find({ businessId: business!._id });
    expect(roles.some((r) => r.name === "Owner")).toBe(true);
    expect(roles.find((r) => r.name === "Owner")?.permissions).toContain("sales.pos.checkout");
  });

  it("logs in with valid credentials", async () => {
    const session = await login({ email: "owner@test.com", password: "password12345" });
    expect(session.accessToken).toBeTruthy();
  });
});
