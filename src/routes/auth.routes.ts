import { Router } from "express";
import passport from "passport";
import { env } from "../config/env.js";
import type { IUser } from "../models/User.js";
import { sendWelcomeEmail } from "../services/email.service.js";
import { createSessionForUser } from "../services/session.service.js";

export const authRouter = Router();

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: env.clients.webUrl }),
  async (req, res) => {
    const user = req.user as IUser;
    const { tokens } = await createSessionForUser(user, "Google OAuth");

    void sendWelcomeEmail(user.email, user.name);

    const redirect = new URL(env.clients.webUrl);
    redirect.searchParams.set("token", tokens.accessToken);
    redirect.searchParams.set("refreshToken", tokens.refreshToken);
    res.redirect(redirect.toString());
  },
);
