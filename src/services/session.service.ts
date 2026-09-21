import { createHash, randomBytes } from "node:crypto";
import { Session } from "../models/Session.js";
import type { IUser } from "../models/User.js";
import { signAccessToken, type JwtPayload } from "../auth/jwt.js";
import { env } from "../config/env.js";
import type { AuthTokens } from "./auth.service.js";

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionForUser(
  user: IUser,
  deviceLabel?: string,
): Promise<{ tokens: AuthTokens; sessionId: string }> {
  const refreshToken = randomBytes(48).toString("hex");
  const session = await Session.create({
    businessId: user.businessId,
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    deviceLabel,
    lastSeenAt: new Date(),
  });

  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    businessId: user.businessId.toString(),
    sessionId: session._id.toString(),
  };

  return {
    tokens: {
      accessToken: signAccessToken(payload),
      refreshToken,
      expiresIn: env.jwtExpiresIn,
    },
    sessionId: session._id.toString(),
  };
}
