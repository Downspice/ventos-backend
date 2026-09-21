import type { GraphQLContext } from "./context.js";
import { forbidden, unauthorized } from "../errors/appError.js";
import type { PermissionCode } from "../constants/permissions.js";

export function requireAuth(ctx: GraphQLContext): asserts ctx is GraphQLContext & {
  user: NonNullable<GraphQLContext["user"]>;
  businessId: NonNullable<GraphQLContext["businessId"]>;
} {
  if (!ctx.user || !ctx.businessId) unauthorized();
}

export function requirePermission(ctx: GraphQLContext, code: PermissionCode): void {
  requireAuth(ctx);
  if (!ctx.permissions.has(code)) forbidden(`Missing permission: ${code}`);
}
